export async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data.error?.message || data.error_description || data.message || data.detail || text || res.statusText;
    const err = new Error(`${res.status} ${msg}`);
    // Attach rich details so upper layers (using logger) get full context for logging
    err.status = res.status;
    err.statusText = res.statusText;
    err.response = { status: res.status, data, headers: Object.fromEntries(res.headers || []) };
    err.url = url;
    err.requestOptions = { method: options.method, headers: options.headers ? 'redacted' : undefined };
    throw err;
  }
  return data;
}

export function formBody(params) {
  return new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]),
  );
}