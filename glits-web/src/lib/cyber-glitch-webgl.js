const VERTEX_SRC = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const DISP_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_intensity;
uniform vec4 u_strikes[6];

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float hash1(float n) {
  return fract(sin(n) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.02 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

vec2 boltWarp(vec2 uv, vec4 strike, float time) {
  vec2 p = uv - strike.xy;
  float pulse = strike.z * (0.6 + 0.4 * sin(time * 28.0 + strike.w * 6.28));
  float r = length(p);
  float ripple = sin(r * 42.0 - time * 18.0) * exp(-r * 5.5);
  float arc = exp(-abs(p.x - sin(p.y * 11.0 + time * 9.0 + strike.w) * 0.08) * 90.0)
            * exp(-abs(p.y) * 2.5);
  float field = (ripple + arc * 1.4) * pulse;
  vec2 grad = vec2(
    sin(p.y * 17.0 + time * 12.0 + strike.w),
    cos(p.x * 13.0 - time * 10.0)
  );
  return grad * field * 0.35;
}

void main() {
  vec2 uv = v_uv;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);

  float t = u_time;
  float n1 = fbm(p * 3.2 + vec2(t * 0.7, t * 0.4));
  float n2 = fbm(p * 4.8 + vec2(-t * 0.5, t * 0.9));
  vec2 disp = vec2(n1, n2) - 0.5;

  disp += vec2(
    fbm(p * 8.0 + vec2(t * 2.1, 0.0)) - 0.5,
    fbm(p * 8.0 + vec2(0.0, t * 2.4)) - 0.5
  ) * 0.45;

  for (int i = 0; i < 6; i++) {
    disp += boltWarp(p, u_strikes[i], t);
  }

  float surge = sin(t * 6.0) * sin(t * 13.0);
  disp *= u_intensity * (0.55 + 0.45 * surge);

  fragColor = vec4(0.5 + disp.x, 0.5 + disp.y, 0.0, 1.0);
}
`;

const ELECTRIC_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_intensity;
uniform vec4 u_strikes[6];

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float hash1(float n) {
  return fract(sin(n) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float lightning(vec2 p, float seed, float time) {
  float bolt = 0.0;
  vec2 prev = vec2(hash1(seed) * 0.7 - 0.35, -1.1);
  for (int i = 0; i < 20; i++) {
    float fy = float(i) / 19.0 * 2.2 - 1.1;
    float wobble = sin(fy * 9.0 + time * 14.0 + seed * 6.28) * 0.18
                 + sin(fy * 27.0 - time * 8.0 + seed) * 0.06
                 + (hash1(seed + fy * 3.7) - 0.5) * 0.12;
    vec2 cur = vec2(wobble, fy);
    float d = segDist(p, prev, cur);
    float core = exp(-d * 220.0);
    float glow = exp(-d * 55.0);
    bolt = max(bolt, core * 1.6 + glow * 0.55);
    prev = cur;
  }
  float flicker = 0.55 + 0.45 * sin(time * 37.0 + seed * 12.0);
  return bolt * flicker;
}

float plasma(vec2 p, float time) {
  float v = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 q = p;
    q.x += sin(time * 1.8 + fi * 2.1) * 0.3;
    q.y += cos(time * 2.3 + fi * 1.7) * 0.2;
    v += sin(q.x * 12.0 + time * 3.5 + fi) * sin(q.y * 10.0 - time * 2.8 + fi * 1.3);
  }
  return abs(v) * 0.18;
}

void main() {
  vec2 uv = v_uv;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time;

  float elec = 0.0;
  for (int i = 0; i < 6; i++) {
    float seed = u_strikes[i].w + float(i) * 1.73;
    vec2 origin = u_strikes[i].xy;
    elec += lightning(p - origin * 0.15, seed, t) * u_strikes[i].z;
  }

  elec += plasma(p, t) * u_intensity;
  elec += noise(p * 80.0 + t * 40.0) * step(0.82, elec) * 0.6;

  float scan = sin(uv.y * u_resolution.y * 0.6 + t * 20.0) * 0.04;
  elec += scan * u_intensity;

  vec3 cyan = vec3(0.1, 0.92, 1.0);
  vec3 pink = vec3(1.0, 0.12, 0.52);
  vec3 gold = vec3(1.0, 0.78, 0.2);

  vec3 col = vec3(0.0);
  col += cyan * elec * 1.4;
  col += pink * elec * elec * 1.1;
  col += gold * pow(elec, 3.0) * 2.5;

  float alpha = clamp(elec * 1.35 * u_intensity, 0.0, 0.92);
  fragColor = vec4(col, alpha);
}
`;

/**
 * @param {WebGL2RenderingContext} gl
 * @param {number} type
 * @param {string} src
 */
function compileShader(gl, type, src) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log || 'Shader compile failed');
  }
  return shader;
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {string} vert
 * @param {string} frag
 */
function createProgram(gl, vert, frag) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vert);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, frag);
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(log || 'Program link failed');
  }
  return program;
}

/**
 * @param {object} options
 * @param {HTMLCanvasElement} options.overlayCanvas
 * @param {HTMLCanvasElement} options.displacementCanvas
 */
export function createCyberGlitchEngine({ overlayCanvas, displacementCanvas }) {
  const overlayGl = overlayCanvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
  });
  const dispGl = displacementCanvas.getContext('webgl2', {
    alpha: false,
    premultipliedAlpha: false,
    antialias: false,
  });

  if (!overlayGl || !dispGl) {
    return {
      setActive() {},
      getFrameState() {
        return null;
      },
      resize() {},
      destroy() {},
      supported: false,
    };
  }

  /** @type {WebGL2RenderingContext} */
  const ogl = /** @type {WebGL2RenderingContext} */ (overlayGl);
  /** @type {WebGL2RenderingContext} */
  const dgl = /** @type {WebGL2RenderingContext} */ (dispGl);

  const dispProgram = createProgram(dgl, VERTEX_SRC, DISP_FRAG);
  const elecProgram = createProgram(ogl, VERTEX_SRC, ELECTRIC_FRAG);

  /** @type {WebGLBuffer} */
  const dispBuffer = dgl.createBuffer();
  /** @type {WebGLBuffer} */
  const elecBuffer = ogl.createBuffer();
  const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]);

  for (const gl of [dgl, ogl]) {
    const buf = gl === dgl ? dispBuffer : elecBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
  }

  const dispLocs = {
    position: dgl.getAttribLocation(dispProgram, 'a_position'),
    resolution: dgl.getUniformLocation(dispProgram, 'u_resolution'),
    time: dgl.getUniformLocation(dispProgram, 'u_time'),
    intensity: dgl.getUniformLocation(dispProgram, 'u_intensity'),
    strikes: dgl.getUniformLocation(dispProgram, 'u_strikes'),
  };

  const elecLocs = {
    position: ogl.getAttribLocation(elecProgram, 'a_position'),
    resolution: ogl.getUniformLocation(elecProgram, 'u_resolution'),
    time: ogl.getUniformLocation(elecProgram, 'u_time'),
    intensity: ogl.getUniformLocation(elecProgram, 'u_intensity'),
    strikes: ogl.getUniformLocation(elecProgram, 'u_strikes'),
  };

  let active = false;
  /** @type {'minor' | 'major'} */
  let severity = 'minor';
  let startTime = 0;
  let raf = 0;
  /** @type {Float32Array} */
  let strikes = new Float32Array(24);
  let dispScale = 0;
  /** @type {{ x: number, y: number, rotX: number, rotY: number, skew: number, scale: number, chromatic: number, brightness: number }} */
  let warp = { x: 0, y: 0, rotX: 0, rotY: 0, skew: 0, scale: 1, chromatic: 0, brightness: 1 };

  function randomStrikes() {
    for (let i = 0; i < 6; i++) {
      strikes[i * 4] = (Math.random() - 0.5) * 1.6;
      strikes[i * 4 + 1] = (Math.random() - 0.5) * 0.6;
      strikes[i * 4 + 2] = 0.35 + Math.random() * 0.65;
      strikes[i * 4 + 3] = Math.random() * 100;
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    overlayCanvas.width = Math.floor(w * dpr);
    overlayCanvas.height = Math.floor(h * dpr);
    overlayCanvas.style.width = `${w}px`;
    overlayCanvas.style.height = `${h}px`;

    const dispW = Math.max(256, Math.floor(w * dpr * 0.5));
    const dispH = Math.max(256, Math.floor(h * dpr * 0.5));
    displacementCanvas.width = dispW;
    displacementCanvas.height = dispH;
  }

  /**
   * @param {WebGL2RenderingContext} gl
   * @param {WebGLProgram} program
   * @param {WebGLBuffer} buffer
   * @param {ReturnType<typeof createProgram> extends never ? never : Record<string, WebGLUniformLocation | GLint | null>} locs
   * @param {number} width
   * @param {number} height
   * @param {boolean} additive
   */
  function drawPass(gl, program, buffer, locs, width, height, additive) {
    gl.viewport(0, 0, width, height);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(/** @type {number} */ (locs.position));
    gl.vertexAttribPointer(/** @type {number} */ (locs.position), 2, gl.FLOAT, false, 0, 0);

    const elapsed = (performance.now() - startTime) * 0.001;
    const baseIntensity = severity === 'major' ? 1.0 : 0.45;

    gl.uniform2f(locs.resolution, width, height);
    gl.uniform1f(locs.time, elapsed);
    gl.uniform1f(locs.intensity, baseIntensity);
    gl.uniform4fv(locs.strikes, strikes);

    if (additive) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.clearColor(0, 0, 0, 0);
    } else {
      gl.disable(gl.BLEND);
      gl.clearColor(0.5, 0.5, 0, 1);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function tick() {
    if (!active) return;

    const elapsed = (performance.now() - startTime) * 0.001;
    const baseIntensity = severity === 'major' ? 1.0 : 0.45;

    drawPass(
      dgl,
      dispProgram,
      dispBuffer,
      dispLocs,
      displacementCanvas.width,
      displacementCanvas.height,
      false,
    );

    drawPass(
      ogl,
      elecProgram,
      elecBuffer,
      elecLocs,
      overlayCanvas.width,
      overlayCanvas.height,
      true,
    );

    const surge = Math.sin(elapsed * 6) * Math.sin(elapsed * 13);
    const shake = severity === 'major' ? 1 : 0.4;

    dispScale = (severity === 'major' ? 85 : 38) * baseIntensity * (0.65 + 0.35 * Math.abs(surge));

    warp = {
      x: Math.sin(elapsed * 17) * 6 * shake + Math.sin(elapsed * 41) * 2 * shake,
      y: Math.cos(elapsed * 13) * 4 * shake + Math.sin(elapsed * 29) * 3 * shake,
      rotX: Math.sin(elapsed * 11) * 2.5 * shake,
      rotY: Math.cos(elapsed * 9) * 2 * shake,
      skew: Math.sin(elapsed * 23) * 3 * shake,
      scale: 1 + Math.sin(elapsed * 19) * 0.015 * shake,
      chromatic: baseIntensity * (0.4 + 0.6 * Math.abs(surge)),
      brightness: 1 + baseIntensity * 0.25 * Math.abs(Math.sin(elapsed * 31)),
    };

    raf = requestAnimationFrame(tick);
  }

  resize();
  randomStrikes();

  return {
    supported: true,

    /** @param {boolean} on @param {'minor' | 'major'} [level] */
    setActive(on, level = 'minor') {
      active = on;
      severity = level;
      if (on) {
        startTime = performance.now();
        randomStrikes();
        cancelAnimationFrame(raf);
        tick();
      } else {
        cancelAnimationFrame(raf);
        dispScale = 0;
        warp = { x: 0, y: 0, rotX: 0, rotY: 0, skew: 0, scale: 1, chromatic: 0, brightness: 1 };
        dgl.clearColor(0.5, 0.5, 0, 1);
        dgl.clear(dgl.COLOR_BUFFER_BIT);
        ogl.clearColor(0, 0, 0, 0);
        ogl.clear(ogl.COLOR_BUFFER_BIT);
      }
    },

    getFrameState() {
      if (!active) return null;
      return { dispScale, warp, severity };
    },

    resize,

    destroy() {
      active = false;
      cancelAnimationFrame(raf);
      dgl.deleteProgram(dispProgram);
      ogl.deleteProgram(elecProgram);
      dgl.deleteBuffer(dispBuffer);
      ogl.deleteBuffer(elecBuffer);
    },
  };
}