export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:3000/api/v1";
const API_ORIGIN = API_BASE_URL.replace(/\/api(?:\/v\d+)?\/?$/, "");

function getRoleHeader() {
  try {
    const raw = localStorage.getItem("stas_user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.role || null;
  } catch {
    return null;
  }
}

function getUserIdHeader() {
  try {
    const raw = localStorage.getItem("stas_user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.id || null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const role = getRoleHeader();
  const userId = getUserIdHeader();
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(role ? { "x-user-role": String(role) } : {}),
      ...(userId ? { "x-user-id": String(userId) } : {}),
      ...(options?.headers || {})
    },
    ...options
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, payload: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function apiPut<T>(path: string, payload: unknown): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function apiPatch<T>(path: string, payload: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("stas_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function resolveApiAssetUrl(fileUrl?: string | null) {
  if (!fileUrl) return null;
  const normalized = String(fileUrl).trim();
  if (!normalized) return null;

  if (/^https?:\/\//i.test(normalized) || normalized.startsWith("blob:") || normalized.startsWith("data:")) {
    return normalized;
  }

  if (normalized.startsWith("//")) {
    return `${window.location.protocol}${normalized}`;
  }

  if (normalized.startsWith("/")) {
    return `${API_ORIGIN}${normalized}`;
  }

  return `${API_ORIGIN}/${normalized}`;
}
