import type { MiddlewareHandler } from "hono";

// Helmet-style response headers. Values are tuned for a JSON API behind
// CORS; a frontend SPA served from a different origin pulls its own CSP.
// Keeping this middleware header-only (no CSP report-uri, no mixed-content
// handling) lets Phase 3 Sentry slot in without rewriting any of this.
export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  c.header("x-content-type-options", "nosniff");
  c.header("x-frame-options", "DENY");
  c.header("referrer-policy", "no-referrer");
  c.header(
    "strict-transport-security",
    "max-age=31536000; includeSubDomains"
  );
  // API responses are JSON — no inline scripts, no framing. This CSP is
  // deliberately restrictive: `default-src 'none'` means even if a
  // handler accidentally returned HTML, the browser would refuse to
  // render scripts or load subresources from it.
  c.header("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
};
