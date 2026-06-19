const SPARK_COUNT = 48;

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

float hash1(float n) {
  return fract(sin(n) * 43758.5453123);
}

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

vec2 boltPoint(vec2 a, vec2 b, float t, float seed, float time) {
  vec2 mid = mix(a, b, t);
  vec2 ab = b - a;
  float len = length(ab);
  if (len < 0.001) return mid;
  vec2 perp = vec2(-ab.y, ab.x) / len;
  float disp = sin(t * 14.0 + seed * 6.28 + time * 5.0) * 0.07;
  disp += (hash1(seed + t * 17.3) - 0.5) * 0.14;
  disp += sin(t * 37.0 - time * 11.0 + seed) * 0.035;
  return mid + perp * disp;
}

vec2 boltWarp(vec2 p, vec4 strike, float time) {
  vec2 a = strike.xy;
  vec2 b = strike.zw;
  vec2 prev = a;
  vec2 warp = vec2(0.0);
  float strength = 0.0;

  for (int i = 1; i <= 16; i++) {
    float t = float(i) / 16.0;
    vec2 cur = boltPoint(a, b, t, strike.x + strike.y + strike.z, time);
    float d = segDist(p, prev, cur);
    float influence = exp(-d * 28.0) * (1.0 - t * 0.35);
    vec2 ab = normalize(cur - prev);
    warp += vec2(-ab.y, ab.x) * influence * 0.18;
    strength = max(strength, influence);
    prev = cur;
  }

  return warp * strength * 2.5;
}

void main() {
  vec2 uv = v_uv;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time;
  vec2 disp = vec2(0.0);

  for (int i = 0; i < 6; i++) {
    disp += boltWarp(p, u_strikes[i], t);
  }

  float surge = sin(t * 6.0) * sin(t * 13.0);
  disp *= u_intensity * (0.45 + 0.55 * abs(surge));

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
uniform vec4 u_sparks[48];

float hash1(float n) {
  return fract(sin(n) * 43758.5453123);
}

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

vec2 boltPoint(vec2 a, vec2 b, float t, float seed, float time) {
  vec2 mid = mix(a, b, t);
  vec2 ab = b - a;
  float len = length(ab);
  if (len < 0.001) return mid;
  vec2 perp = vec2(-ab.y, ab.x) / len;
  float disp = sin(t * 14.0 + seed * 6.28 + time * 5.0) * 0.07;
  disp += (hash1(seed + t * 17.3) - 0.5) * 0.14;
  disp += sin(t * 37.0 - time * 11.0 + seed) * 0.035;
  return mid + perp * disp;
}

float boltSegment(vec2 p, vec2 a, vec2 b, float width, float coreWidth) {
  float d = segDist(p, a, b);
  float core = exp(-d / coreWidth);
  float glow = exp(-d / width);
  float halo = exp(-d / (width * 3.5));
  return core * 2.2 + glow * 0.85 + halo * 0.25;
}

float branchArc(vec2 p, vec2 origin, float angle, float length, float seed, float time) {
  vec2 dir = vec2(cos(angle), sin(angle));
  vec2 end = origin + dir * length;
  float bolt = 0.0;
  vec2 prev = origin;

  for (int i = 1; i <= 10; i++) {
    float t = float(i) / 10.0;
    vec2 cur = boltPoint(origin, end, t, seed + float(i), time);
    float w = mix(0.012, 0.003, t);
    float cw = w * 0.18;
    bolt = max(bolt, boltSegment(p, prev, cur, w, cw));
    prev = cur;
  }
  return bolt;
}

float mainBolt(vec2 p, vec4 strike, float time) {
  vec2 a = strike.xy;
  vec2 b = strike.zw;
  float seed = a.x * 17.0 + b.y * 31.0 + a.y * 13.0;
  float bolt = 0.0;
  vec2 prev = a;

  for (int i = 1; i <= 22; i++) {
    float t = float(i) / 22.0;
    vec2 cur = boltPoint(a, b, t, seed, time);
    float w = mix(0.022, 0.005, t);
    float cw = w * 0.15;
    bolt = max(bolt, boltSegment(p, prev, cur, w, cw));

    if (hash1(seed + t * 19.0) > 0.55 && t > 0.1 && t < 0.92) {
      vec2 seg = cur - prev;
      float baseAngle = atan(seg.y, seg.x);
      float branchAngle = baseAngle + (hash1(seed + t * 7.0) - 0.5) * 2.4;
      float branchLen = 0.1 + hash1(seed + t * 11.0) * 0.32;
      bolt = max(bolt, branchArc(p, cur, branchAngle, branchLen, seed + t * 33.0, time) * 0.78);

      if (hash1(seed + t * 29.0) > 0.68) {
        float branchAngle2 = baseAngle + (hash1(seed + t * 13.0) - 0.5) * 3.0;
        float branchLen2 = branchLen * (0.45 + hash1(seed + t * 17.0) * 0.35);
        vec2 subOrigin = cur + vec2(cos(branchAngle), sin(branchAngle)) * branchLen * 0.55;
        bolt = max(bolt, branchArc(p, subOrigin, branchAngle2, branchLen2, seed + t * 47.0, time) * 0.55);
      }
    }
    prev = cur;
  }

  float flicker = 0.65 + 0.35 * sin(time * 42.0 + seed);
  flicker *= 0.8 + 0.2 * sin(time * 97.0 + seed * 2.0);
  return bolt * flicker;
}

float sparkParticle(vec2 p, vec4 sp, float t) {
  float spawn = sp.z;
  float age = t - spawn;
  if (age < 0.0 || age > 0.65) return 0.0;

  float seed = sp.w;
  vec2 vel = vec2(hash1(seed) - 0.5, hash1(seed + 1.7) - 0.42);
  vel = normalize(vel + vec2(0.001)) * (0.6 + hash1(seed + 3.1) * 1.4);
  vel.y -= age * 0.35;

  vec2 pos = sp.xy + vel * age;
  vec2 tail = pos - vel * (0.02 + age * 0.06);

  float dCore = length(p - pos);
  float dTrail = segDist(p, tail, pos);

  float fade = (1.0 - age / 0.65);
  fade *= fade;
  float energy = (0.4 + hash1(seed + 5.0) * 0.6) * fade;

  float core = exp(-dCore / 0.0035) * energy * 3.0;
  float trail = exp(-dTrail / 0.0012) * energy * 1.6;
  float halo = exp(-dCore / 0.012) * energy * 0.5;

  return core + trail + halo;
}

float allSparks(vec2 p, float t) {
  float s = 0.0;
  for (int i = 0; i < 48; i++) {
    s += sparkParticle(p, u_sparks[i], t);
  }
  return s;
}

vec3 lightningColor(float intensity) {
  float hot = smoothstep(0.45, 1.0, intensity);
  vec3 core = vec3(1.0, 0.98, 0.95) * hot * 1.6;
  vec3 inner = vec3(0.55, 0.88, 1.0) * intensity * 1.1;
  vec3 outer = vec3(0.45, 0.15, 0.85) * intensity * 0.35;
  vec3 cyan = vec3(0.1, 0.92, 1.0) * intensity * 0.4;
  return core + inner + outer + cyan;
}

vec3 sparkColor(float intensity) {
  vec3 hot = vec3(1.0, 0.95, 0.8) * intensity;
  vec3 trail = vec3(0.3, 0.85, 1.0) * intensity * 0.7;
  return hot + trail;
}

void main() {
  vec2 uv = v_uv;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time;

  float elec = 0.0;
  for (int i = 0; i < 6; i++) {
    elec += mainBolt(p, u_strikes[i], t);
  }

  float sparks = allSparks(p, t);
  elec = max(elec, sparks * 0.85);

  vec3 col = lightningColor(elec);
  col += sparkColor(sparks) * 1.2;
  col += vec3(0.1, 0.92, 1.0) * sparks * 0.6;

  float alpha = clamp(max(elec, sparks) * 1.1 * u_intensity, 0.0, 0.95);
  fragColor = vec4(col * alpha, alpha);
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
 * @param {number} count
 * @param {number} aspect
 */
function randomStrike(count, aspect) {
  const sx = (Math.random() - 0.5) * 1.3;
  const sy = -0.75 + Math.random() * 0.35;
  const ex = sx + (Math.random() - 0.5) * 1.1;
  const ey = 0.15 + Math.random() * 0.85;
  return [sx * aspect, sy, ex * aspect, ey];
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
    sparks: ogl.getUniformLocation(elecProgram, 'u_sparks'),
  };

  let active = false;
  /** @type {'minor' | 'major'} */
  let severity = 'minor';
  let startTime = 0;
  let raf = 0;
  let aspect = 1;
  /** @type {Float32Array} */
  let strikes = new Float32Array(24);
  /** @type {Float32Array} */
  let sparks = new Float32Array(SPARK_COUNT * 4);
  /** @type {number[]} */
  let sparkSlot = Array.from({ length: SPARK_COUNT }, () => 0);
  let dispScale = 0;
  /** @type {{ x: number, y: number, rotX: number, rotY: number, skew: number, scale: number, chromatic: number, brightness: number }} */
  let warp = { x: 0, y: 0, rotX: 0, rotY: 0, skew: 0, scale: 1, chromatic: 0, brightness: 1 };

  function randomStrikes() {
    const count = severity === 'major' ? 5 : 3;
    for (let i = 0; i < 6; i++) {
      if (i < count) {
        const s = randomStrike(i, aspect);
        strikes.set(s, i * 4);
      } else {
        strikes[i * 4] = 0;
        strikes[i * 4 + 1] = -2;
        strikes[i * 4 + 2] = 0;
        strikes[i * 4 + 3] = -2;
      }
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} time
   * @param {number} energy
   */
  function emitSpark(x, y, time, energy) {
    let slot = 0;
    let oldest = Infinity;
    for (let i = 0; i < SPARK_COUNT; i++) {
      const spawn = sparks[i * 4 + 2];
      if (spawn <= 0 || time - spawn > 0.65) {
        slot = i;
        break;
      }
      if (spawn < oldest) {
        oldest = spawn;
        slot = i;
      }
    }
    sparks[slot * 4] = x + (Math.random() - 0.5) * 0.02;
    sparks[slot * 4 + 1] = y + (Math.random() - 0.5) * 0.02;
    sparks[slot * 4 + 2] = time;
    sparks[slot * 4 + 3] = energy + Math.random() * 200;
    sparkSlot[slot] = time;
  }

  /**
   * @param {number} time
   * @param {number} burst
   */
  function emitSparksFromStrikes(time, burst) {
    const count = severity === 'major' ? 6 : 3;
    for (let i = 0; i < count; i++) {
      const ax = strikes[i * 4];
      const ay = strikes[i * 4 + 1];
      const bx = strikes[i * 4 + 2];
      const by = strikes[i * 4 + 3];
      if (ay < -1.5) continue;

      const bolts = burst ? 4 + Math.floor(Math.random() * 5) : 1 + Math.floor(Math.random() * 2);
      for (let j = 0; j < bolts; j++) {
        const t = 0.1 + Math.random() * 0.85;
        const px = ax + (bx - ax) * t + (Math.random() - 0.5) * 0.06;
        const py = ay + (by - ay) * t + (Math.random() - 0.5) * 0.04;
        emitSpark(px, py, time, 0.5 + Math.random() * 0.5);
      }
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    aspect = w / h;

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
   * @param {Record<string, WebGLUniformLocation | GLint | null>} locs
   * @param {number} width
   * @param {number} height
   * @param {boolean} additive
   * @param {number} elapsed
   */
  function drawPass(gl, program, buffer, locs, width, height, additive, elapsed) {
    gl.viewport(0, 0, width, height);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(/** @type {number} */ (locs.position));
    gl.vertexAttribPointer(/** @type {number} */ (locs.position), 2, gl.FLOAT, false, 0, 0);

    const baseIntensity = severity === 'major' ? 1.0 : 0.5;

    gl.uniform2f(locs.resolution, width, height);
    gl.uniform1f(locs.time, elapsed);
    gl.uniform1f(locs.intensity, baseIntensity);
    gl.uniform4fv(locs.strikes, strikes);
    if (locs.sparks) gl.uniform4fv(locs.sparks, sparks);

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

  let lastSparkEmit = 0;
  let frameCount = 0;

  function tick() {
    if (!active) return;

    const elapsed = (performance.now() - startTime) * 0.001;
    const baseIntensity = severity === 'major' ? 1.0 : 0.5;
    frameCount += 1;

    const emitInterval = severity === 'major' ? 0.04 : 0.08;
    if (elapsed - lastSparkEmit > emitInterval) {
      emitSparksFromStrikes(elapsed, Math.random() < (severity === 'major' ? 0.35 : 0.12));
      lastSparkEmit = elapsed;
    }

    if (frameCount % 90 === 0) {
      randomStrikes();
    }

    drawPass(
      dgl,
      dispProgram,
      dispBuffer,
      dispLocs,
      displacementCanvas.width,
      displacementCanvas.height,
      false,
      elapsed,
    );

    drawPass(
      ogl,
      elecProgram,
      elecBuffer,
      elecLocs,
      overlayCanvas.width,
      overlayCanvas.height,
      true,
      elapsed,
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
  sparks.fill(0);

  return {
    supported: true,

    /** @param {boolean} on @param {'minor' | 'major'} [level] */
    setActive(on, level = 'minor') {
      active = on;
      severity = level;
      if (on) {
        startTime = performance.now();
        lastSparkEmit = 0;
        frameCount = 0;
        randomStrikes();
        sparks.fill(0);
        emitSparksFromStrikes(0.001, true);
        cancelAnimationFrame(raf);
        tick();
      } else {
        cancelAnimationFrame(raf);
        dispScale = 0;
        sparks.fill(0);
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