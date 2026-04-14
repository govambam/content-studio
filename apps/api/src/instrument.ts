// Sentry initialization. Imported first from index.ts so that the SDK
// patches Node internals before any other module is loaded.
import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;
const environment = process.env.NODE_ENV || "development";

if (!dsn) {
  if (environment === "production") {
    // Fail closed in production — we don't want a silently un-instrumented API.
    throw new Error("SENTRY_DSN is required in production");
  }
  // eslint-disable-next-line no-console
  console.warn("[sentry] SENTRY_DSN not set; error reporting disabled");
} else {
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: 0.1,
    release: process.env.RELEASE_SHA || undefined,
  });
}

export { Sentry };
