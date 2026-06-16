import { log, LOG_TYPE, serializeError } from "$lib/logger.js";
import _ from "lodash";

/**
 * Global error handler for SvelteKit server (web).
 * Captures all unhandled errors with full context + functionName where possible.
 * Follows log-example.js global handler pattern.
 * This ensures no error is silent in OAuth/delegation/store flows.
 */
export async function handleError({ error, event }) {
  const errInfo = serializeError(error, "hooks.server.handleError");

  log.error(
    {
      type: LOG_TYPE.UNCAUGHT_EXCEPTION,
      functionName: "hooks.server.handleError",
      url: event.url.pathname,
      method: event.request.method,
      err: errInfo,
      // Add request headers sanitized if needed for debug (no secrets)
      headers: Object.fromEntries(
        [...event.request.headers.entries()].filter(
          ([k]) =>
            !k.toLowerCase().includes("auth") &&
            !k.toLowerCase().includes("cookie"),
        ),
      ),
    },
    "Unhandled server error in SvelteKit web app",
  );

  return {
    message: _.get(error, "message") || "Internal error - see server logs for full diagnostic trace",
  };
}

/** Optional: log every server request at debug for full process tracing */
export async function handle({ event, resolve }) {
  const start = Date.now();
  const routeLog = log.child({
    functionName: "hooks.server.handle",
    url: event.url.pathname,
    method: event.request.method,
  });

  if (process.env.LOG_LEVEL === "debug" || process.env.LOG_LEVEL === "trace") {
    routeLog.debug("Incoming request");
  }

  const response = await resolve(event);

  const duration = Date.now() - start;
  if (process.env.LOG_LEVEL === "debug" || process.env.LOG_LEVEL === "trace") {
    routeLog.debug(
      { status: response.status, durationMs: duration },
      "Request completed",
    );
  }

  return response;
}
