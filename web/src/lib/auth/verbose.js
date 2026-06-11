export function serializeError(err) {
  if (!err || typeof err !== 'object') {
    return { message: String(err) };
  }

  const out = {
    message: err.message,
    name: err.name,
    stack: err.stack,
  };

  for (const key of [
    'status',
    'statusCode',
    'error',
    'headers',
    'data',
    'response',
    'cause',
    'code',
  ]) {
    if (err[key] !== undefined) out[key] = err[key];
  }

  if (err.response?.data !== undefined) out.responseData = err.response.data;
  if (err.response?.status !== undefined) out.responseStatus = err.response.status;

  return out;
}

export function logAuth(provider, phase, payload) {
  console.error(`[glits/${provider}] ${phase}`, JSON.stringify(payload, null, 2));
}

export function authEntry(phase, data = {}) {
  return { phase, ...data };
}