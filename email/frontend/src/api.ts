// Talks to the email/ FastAPI backend. Admin actions run there, behind the dashboard token,
// so the browser never holds a database key.
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8080';
export const DASHBOARD_TOKEN = import.meta.env.VITE_DASHBOARD_TOKEN ?? '';

export async function adminFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...init.headers, 'X-Dashboard-Token': DASHBOARD_TOKEN },
  });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} failed with ${res.status}`);
  return res.json() as Promise<T>;
}
