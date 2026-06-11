# Logging Architecture and Communication Guidelines

This document explains two things completely and self-containedly so that any human or AI can follow the project's requirements without prior context:

1. The required logging architecture (philosophy + technical patterns).
2. How the user (project owner) wants to be communicated with, especially around logs, debugging, and code changes.

Everything here is derived directly from the existing codebase examples (`log-example.js`, `logger-example.js`), the current implementations in `web/src/lib/logger.js` and `cli/src/lib/logger.js`, usage patterns across the project, and explicit user feedback during debugging sessions.

---

## Part 1: How the User Wants to Be Communicated With

### Core Rule (Non-Negotiable)
**Never make code changes, refactors, "improvements", or fixes unless the user has given explicit permission in the current conversation.**

- The user has stated directly: "dont make any fucking code changes without explicit permission."
- Even if you see an obvious bug, suboptimal code, or a "clear" improvement while investigating a log, **do not edit files**.
- "I just asked about the log. i didn't direct you to make changes."
- Past experience: When a user pastes logs and asks for understanding, proactive code edits cause frustration and loss of trust.

### Specific Communication Rules Derived from Feedback

- **When the user pastes logs** (e.g. "im getting this log back from teh bluesky oauth thing:" followed by JSON lines, or "now what the fuck does the log mean?"):
  - The request is **only for explanation and understanding** of the log.
  - Provide a clear, direct breakdown of what each line means in the context of the code that produced it.
  - Map fields back to the source (e.g. `handlePresent`, `passwordLength`, `phase`, `type: "USER_AUTH_ERROR"`, `isExpectedUserError`).
  - Explain the flow the log represents.
  - Stop there. Do not suggest fixes, normalize inputs, add validation, change log levels, etc.

- **Match requested verbosity**:
  - If the user says "answer me in 2 or 3 sentences", do exactly that (or fewer).
  - Do not produce long explanations or walls of text unless requested.

- **Never assume intent**:
  - Do not assume "they pasted a log with an error → they want me to fix the error path."
  - Do not assume "this is a bug report → I should improve the code."
  - Explicitly confirm understanding if the request is ambiguous: "You want me to explain what this log means in the current code, correct?"

- **After any misunderstanding**:
  - Acknowledge the error plainly and briefly.
  - Revert any unauthorized changes immediately (using git) if any were made.
  - Re-state the rule you will follow going forward.
  - Then wait for the next explicit direction.

- **General style preferences observed**:
  - Direct, no filler, no preamble, no "Here's a comprehensive guide..." when not asked.
  - Lead with the answer.
  - Use short sentences.
  - When explaining logs, use structure (numbered lines or bullets) but keep overall response tight.
  - Avoid defensive language or long justifications.

- **What "explicit permission" looks like**:
  - User says things like: "fix the handle handling", "add @ stripping", "implement this change", "write the code for X", "update the file to do Y".
  - Vague statements like "the login is broken" or just pasting logs do **not** count as permission.

Failure to follow these rules has already caused significant frustration in this project. Any future AI or collaborator must treat these as hard constraints.

---

## Part 2: The Required Logging Architecture

### 2.1 Philosophy and Design Goals

The logging system is intentionally **"abnormally explicit"** (exact phrase used in the source comments).

**Why this style exists**:
- The system is split: Web runs on Vercel serverless (ephemeral, hard to attach debugger). CLI runs on the user's machine or in CI.
- Most debugging happens by the user pasting raw log lines into chat.
- When something fails (OAuth exchange, Bluesky login, Blob save, Nostr bunker, queue processing, platform send), the developer often cannot reproduce the exact environment, token state, or network conditions.
- Therefore, **every log must contain enough context to diagnose the problem from the log alone**, without needing to read the source code in parallel or ask follow-up questions.

Core principles (visible in comments and usage):
- "Follows log-example.js pattern for diagnostic power."
- "Emphasizes functionName, phases, rich context for abnormally explicit diagnostics."
- "Output: structured JSON (human 'message' first for Vercel clarity + full details)."
- Global error handlers must capture everything so nothing is silent.
- Use child loggers to carry context forward through a request/command.
- Phases create a traceable "breadcrumb" trail through multi-step processes.
- Every error (even expected user errors) carries the full serialized error + relevant context.
- Categorize with explicit `type` fields so logs can be filtered/queried later.

This is **not** minimal "info/warn/error" logging. It is forensic logging.

### 2.2 Base Technology and Configuration

Both web and CLI use **pino** with a consistent shape:

- `messageKey: 'message'` → the second argument to `.info(msg)`, `.error(...)` becomes the human-readable `message` field.
- Custom level formatter that always emits `severity: "INFO"|"WARN"|"ERROR"` + `level: number`. This makes logs work well in Vercel, Google Cloud Logging, and local `pino-pretty` without losing cloud semantics.
- `base: { service, version }` injected automatically.
- `level` controlled by `LOG_LEVEL` env var (default "info").

**Web** (`web/src/lib/logger.js`):
- Adapted from `logger-example.js` but without hard GCP dependency (Vercel uses its own log ingestion).
- Exports `LOG_TYPE` (success steps + error categories), `serializeError`, `createLogger`, the default `log`, and a small `authEntry` helper.
- `isVercel` detection for a dev-mode warning.

**CLI** (`cli/src/lib/logger.js`):
- Similar but uses `ERROR_TYPE` (slightly different set of constants, focused on queue/send/blob/platform concerns).
- Also exports `serializeError` (slightly simpler version than web's).

**Historical reference**:
- `log-example.js` (root): Old Express/GCP example showing the desired pattern of rich objects + `type: ERROR_TYPE.XXX` + `functionName` on every error log, plus global `uncaughtException`/`unhandledRejection` handlers that log with full context then exit.
- `logger-example.js` (root): The GCP/pino config template that both current loggers descend from.

### 2.3 The Fundamental Pattern: Child Loggers + Phases + Types

The recommended usage (directly from the JSDoc in `web/src/lib/logger.js`):

```js
const log = createLogger();
const fnLog = log.child({ provider: 'bluesky', functionName: 'bluesky/+page.server.js:default' });

const actionLog = fnLog.child({ phase: 'bluesky:action' });
actionLog.info({ handlePresent: ..., passwordLength: ... }, 'Bluesky login action started');

const loginLog = actionLog.child({ phase: 'bluesky:login' });
loginLog.info('Starting Bluesky login');
// ... later ...
loginLog.warn({ type: 'USER_AUTH_ERROR', err: serializeError(err), handle, service, isExpectedUserError: true }, `Bluesky login failed: ${errorMessage}`);
```

**Key elements that must appear**:

1. **`functionName`** (or `cmd` in CLI commands):
   - Identifies exactly which piece of code emitted the log.
   - Often includes the file + exported function (e.g. `'bluesky/+page.server.js:default'`, `'hooks.server.handleError'`).
   - Set once at the top of a module or command and carried via child.

2. **`phase`** (for any multi-step flow):
   - Creates a sequence: `bluesky:action` → `bluesky:login` → `bluesky:blob:save`.
   - Or in OAuth: `exchange:request`, `exchange:response:success`, `fetch:start`, etc.
   - Child loggers inherit previous context and add/override the current phase.
   - When viewing raw JSON pastes, you will sometimes see duplicate `"phase"` keys — this is an artifact of how pino child bindings + data objects are serialized in the viewer's output. The final effective phase is the most specific one.

3. **`type: LOG_TYPE.XXX` or `type: ERROR_TYPE.XXX`**:
   - Required on almost every structured log, especially errors.
   - Makes logs machine-filterable and signals intent (was this expected? a validation problem? a blob failure?).
   - Web has a rich `LOG_TYPE` with both success markers (`OAUTH_REDIRECT`, `BLOB_SAVE_SUCCESS`, `NOSTR_CONNECT`, ...) and error markers.
   - CLI uses `ERROR_TYPE` for its concerns.

4. **`serializeError(err, optionalFunctionName)`** (web) or `serializeError(err)` (CLI):
   - **Always** use this when logging a caught error.
   - Captures: `message`, `name`, `stack`, `code`, plus any of `status`, `headers`, `response`, `data`, `body`, `cause`, plus `responseData` / `responseStatus` helpers.
   - In the user's example logs, this is why the third line contains the full XrpcClient stack + every response header from bsky.social (including `ratelimit-*` fields).

5. **Context fields on the log object**:
   - Anything that helps reconstruct what happened: `handle` (the input value, not secret), `passwordLength` (never the password), `service`, `pathname`, `queue`, `id`, `provider`, `retry`, `dryRun`, `hasAccessToken` (boolean only), etc.
   - In auth client logs: the full `result` from SvelteKit form actions is captured so you can see what the browser received.

6. **Global handlers** (mandatory pattern from log-example.js):
   - `process.on('uncaughtException'...)` and `'unhandledRejection'` in CLI `bin/glits.js`.
   - `handleError` + request `handle` hook in SvelteKit `hooks.server.js`.
   - These must log with `type: LOG_TYPE.UNCAUGHT_EXCEPTION` (or equivalent) + full `serializeError` + relevant request/context before exiting.

### 2.4 Concrete Walkthrough Using the User's Actual Logs

The logs the user has pasted match the code in `web/src/routes/auth/bluesky/+page.server.js` exactly:

1. **"Bluesky login action started"** (info)
   - Produced by `actionLog.info({ handlePresent: Boolean(handle), passwordLength: password.length, service }, 'Bluesky login action started')`
   - `passwordLength: 19` in the second paste = normal for a copied app password containing dashes.
   - `handle: "terrifickid"` later in the error log = the raw user input (note: no `@` stripping or domain validation at the time of the log).

2. **"Starting Bluesky login"** (info)
   - `loginLog = actionLog.child({ phase: 'bluesky:login' }); loginLog.info('Starting Bluesky login');`
   - Then the actual `await agent.login(...)`.

3. **The WARN line with `type: "USER_AUTH_ERROR"`**
   - Inside the `catch`:
     ```js
     const isAuthError = err.status === 401 || errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('password');
     loginLog[isAuthError ? 'warn' : 'error']({
       type: isAuthError ? 'USER_AUTH_ERROR' : LOG_TYPE.OAUTH_EXCHANGE_ERROR,
       err: errInfo,           // result of serializeError
       handle,
       service,
       isExpectedUserError: isAuthError,
     }, `Bluesky login failed: ${errorMessage}`);
     ```
   - This is **intentional**. Even "expected" user auth failures (bad password, bad handle like bare "terrifickid" or "test") are logged at warn with the **full** error payload so the rate limit headers, exact stack, and response body are visible in the logs.
   - `isExpectedUserError: true` is a signal that this was not a system bug.

The duplicate phase/service keys in the pasted JSON and the outer `2026-06-11 ... [info]` prefix are normal artifacts of the logging pipeline + pino child merging. The inner object is the authoritative structured log.

### 2.5 Anti-Patterns (Things the Architecture Forbids)

- Logging only a string message with no context object.
- Catching an error and logging only `err.message` without `serializeError`.
- Using `console.log` / `console.error` for operational events (use the pino `log`).
- Omitting `functionName` or `phase` on anything that is part of a larger flow.
- Logging secrets (password values, full tokens, cookies). Use lengths, booleans (`hasAccessToken`), or safe identifiers only.
- Silent failure paths — the design explicitly wants visible, categorized failures.
- Treating user auth errors as "don't log" — the architecture wants them logged richly with `USER_AUTH_ERROR` + `isExpectedUserError`.

### 2.6 Web-Specific vs CLI-Specific Notes

**Web (SvelteKit + Vercel)**:
- Extra client-side logging layer in `web/src/lib/auth/client-log.js` (and per-provider wrappers like `bluesky-client.js`).
- Form actions log both server result and what the enhance function saw on the client.
- This is why you see `client:form:result`, `client:serverResponse`, etc. in some traces.
- `authEntry` helper exists but is not heavily used in current code.

**CLI**:
- Commands create a top-level `cmdLog = log.child({ cmd: 'send', queue: ..., retry: ... })`.
- Then per-file or per-token `fileLog` children.
- Errors during send are also written back into the queue JSON (`errorDetails = serializeError(err)`).

### 2.7 Environment and Level Control

- `LOG_LEVEL=debug` or `trace` enables extra request-level logging in hooks and some libraries.
- In production (Vercel / when `K_SERVICE` or `VERCEL` is set), you get clean JSON.
- Locally, extra warnings may appear if you set a level.

---

## How to Use This Document

Any future AI, collaborator, or you in six months should be able to:
- Read this file.
- Look at a pasted log (like the ones containing `phase":"bluesky:action"`, `passwordLength`, `USER_AUTH_ERROR`, full `err` with rate limit headers).
- Immediately understand what the code was doing, why that exact log shape was emitted, and what the user's request probably was ("explain the log" vs "fix it").

When in doubt, re-read Part 1 before taking any action that modifies code or assumes the user wants a change.

This architecture exists to make debugging via log pastes as effective as possible. The communication rules exist to keep the collaboration sane and low-friction.