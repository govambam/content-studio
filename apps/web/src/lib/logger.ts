// Thin logger shim. In dev it prints via console so devtools stays useful.
// In prod it is a no-op today; Phase 3 swaps the implementation for Sentry
// breadcrumbs + console-free release builds.
const isDev = import.meta.env.DEV;

type LogFields = Record<string, unknown>;

function emit(
  level: "debug" | "info" | "warn" | "error",
  msg: string,
  fields?: LogFields
) {
  if (!isDev) return;
  const fn = console[level] ?? console.log;
  if (fields) fn(`[${level}] ${msg}`, fields);
  else fn(`[${level}] ${msg}`);
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => emit("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => emit("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => emit("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => emit("error", msg, fields),
};
