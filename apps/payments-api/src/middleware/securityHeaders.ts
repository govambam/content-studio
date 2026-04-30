import type { MiddlewareHandler } from "hono";

// Helmet-style response headers tuned for a JSON API. Mirrors the
// content-studio-api middleware so both services present the same
// hardened defaults.
export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  c.header("x-content-type-options", "nosniff");
  c.header("x-frame-options", "DENY");
  c.header("referrer-policy", "no-referrer");
  c.header(
    "strict-transport-security",
    "max-age=31536000; includeSubDomains",
  );
  c.header(
    "content-security-policy",
    "default-src 'none'; frame-ancestors 'none'",
  );
};
