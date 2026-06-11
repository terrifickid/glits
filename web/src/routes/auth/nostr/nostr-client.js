import { logAuthClient, logAuthQueryError } from '$lib/auth/client-log.js';

export function startNostrPolling(session, onUpdate) {
  if (!session) return () => {};

  let cancelled = false;

  const poll = async () => {
    logAuthClient('nostr', { phase: 'poll:start', session });

    while (!cancelled) {
      try {
        const res = await fetch(`/auth/nostr/wait?session=${session}`);
        const body = await res.json().catch(() => ({}));

        if (body.ok) {
          logAuthClient('nostr', { phase: 'poll:success', npub: body.npub });
          window.location.href = '/?connected=nostr';
          return;
        }

        if (res.status === 408) continue;

        const error = body.error || 'Connection failed';
        logAuthQueryError('nostr', error, { status: res.status, body });
        onUpdate({ status: 'error', error });
        return;
      } catch (err) {
        const error = err.message || 'Connection failed';
        logAuthQueryError('nostr', error, { error: err });
        onUpdate({ status: 'error', error });
        return;
      }
    }
  };

  poll();

  return () => {
    cancelled = true;
  };
}