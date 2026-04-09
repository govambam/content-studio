import type { ApiResponse } from "@content-studio/shared";

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
        ...options?.headers,
      },
    });

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

  del: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};
