import { io as socketIo } from "socket.io-client";

// Browser requests use the same HTTPS origin; the deployment proxies /api and /socket.io.
export async function apiFetch(input, options = {}) {
  const url = typeof input === "string" ? input : String(input);
  if (!url.startsWith("/api/")) throw new Error("API requests must use the same origin");
  const headers = new Headers(options.headers);
  headers.delete("Authorization");
  const response = await globalThis.fetch(url, { ...options, headers, credentials: "same-origin" });
  if (response.status === 401 && !url.endsWith("/login")) window.dispatchEvent(new Event("session-expired"));
  return response;
}
export function createSocket() {
  return socketIo(undefined, { withCredentials: true });
}
