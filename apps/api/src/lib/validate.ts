import type { Context } from "hono";
import { z, type ZodSchema } from "zod";

// Route handlers call `parseBody(c, schema)` (or `parseParams`). On
// success you get `{ ok: true, data }`; on failure you get
// `{ ok: false, response }` and must return the response immediately.
// The 400 body is the canonical `{ data, error }` envelope so the
// frontend doesn't need a separate branch for validation errors.
export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

function formatIssues(error: z.ZodError): string {
  // Keep the message short — pino carries the full issue list separately.
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");
}

export async function parseBody<T>(
  c: Context,
  schema: ZodSchema<T>
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    const response = c.json(
      { data: null, error: "invalid JSON body" },
      400
    );
    return { ok: false, response };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = formatIssues(result.error);
    c.get("logger")?.warn(
      { issues: result.error.issues, path: new URL(c.req.url).pathname },
      "validation_failed"
    );
    const response = c.json({ data: null, error: message }, 400);
    return { ok: false, response };
  }
  return { ok: true, data: result.data };
}

export function parseParams<T>(
  c: Context,
  schema: ZodSchema<T>
): ParseResult<T> {
  const raw = c.req.param();
  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = formatIssues(result.error);
    const response = c.json({ data: null, error: message }, 400);
    return { ok: false, response };
  }
  return { ok: true, data: result.data };
}

export { z };
