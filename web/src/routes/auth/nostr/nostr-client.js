import { log, LOG_TYPE } from '$lib/logger.js';

const fnLog = log.child({ provider: 'nostr', functionName: 'nostr-client.js:startNostrPolling' });

export function startNostrPolling(session, onUpdate) {
  if (!session) return () => {};

  let cancelled = false;

  const poll = async () => {
    const stepLog = fnLog.child({ functionName: 'poll', phase: 'nostr:client:poll:start' });
    stepLog.info({ session }, 'Starting Nostr client polling for delegation result');

    while (!cancelled) {
      try {
        const res = await fetch(`/auth/nostr/wait?session=${session}`);
        const body = await res.json().catch(() => ({}));

        if (body.ok) {
          stepLog.info({ phase: 'nostr:client:poll:success', npub: body.npub }, 'Nostr polling success, redirecting');
          window.location.href = '/?connected=nostr';
          return;
        }

        if (res.status === 408) continue;

        const error = body.error || 'Connection failed';
        stepLog.error(
          {
            type: LOG_TYPE.NOSTR_DELEGATION_ERROR,
            functionName: 'poll',
            error,
            status: res.status,
            body,
          },
          'Nostr polling failed',
        );
        onUpdate({ status: 'error', error });
        return;
      } catch (err) {
        const error = err.message || 'Connection failed';
        stepLog.error(
          {
            type: LOG_TYPE.NOSTR_DELEGATION_ERROR,
            functionName: 'poll',
            err: { message: error },
          },
          'Nostr polling exception',
        );
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