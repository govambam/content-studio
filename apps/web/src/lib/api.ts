import type { ApiResponse } from "@content-studio/shared";
import { CLIENT_ID } from "./clientId";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-client-id": CLIENT_ID,
        ...options?.headers,
      },
    });

    // Non-JSON response (proxy error page, 404 HTML, plain-text 500,
    // etc.) would otherwise crash with an opaque "Unexpected token"
    // from res.json(). Peek at the body and surface something useful.
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const body = await res.text();
      const snippet = body.slice(0, 160).trim();
      return {
        data: null,
        error: `API ${res.status} ${res.statusText}${
          snippet ? `: ${snippet}` : ""
        }`,
      } as ApiResponse<T>;
    }

    return (await res.json()) as ApiResponse<T>;
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : String(err),
    } as ApiResponse<T>;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
