export function readAuthDebug(cookies) {
  const raw = cookies.get('glits_auth_debug');
  if (!raw) return undefined;

  cookies.delete('glits_auth_debug', { path: '/' });
  try {
    return JSON.parse(raw);
  } catch {
    return { provider: 'auth', error: 'invalid auth debug cookie' };
  }
}