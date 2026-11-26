/**
 * Browser API client. All client data fetching goes through here (used by TanStack Query).
 * A 401 anywhere means the session idled out → redirect to the login screen.
 */
export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: "same-origin",
  });
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth/signin") && !path.startsWith("/api/auth/signup")) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?reason=expired&next=${next}`;
    throw new ApiError(401, "Session expired", "unauthenticated");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data as { error?: { message?: string; code?: string } }).error;
    throw new ApiError(res.status, err?.message ?? `Request failed (${res.status})`, err?.code);
  }
  return data as T;
}
