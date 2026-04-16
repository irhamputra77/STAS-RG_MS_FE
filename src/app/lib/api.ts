export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:3000/api/v1";
const API_ORIGIN = API_BASE_URL.replace(/\/api(?:\/v\d+)?\/?$/, "");

export type BlobResponse = {
  blob: Blob;
  contentType: string;
  fileName: string | null;
};

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

function getRequestHeaders(options?: RequestInit) {
  const role = getRoleHeader();
  const userId = getUserIdHeader();
  return {
    "Content-Type": "application/json",
    ...(role ? { "x-user-role": String(role) } : {}),
    ...(userId ? { "x-user-id": String(userId) } : {}),
    ...(options?.headers || {})
  };
}

function getFilenameFromDisposition(disposition: string | null) {
  if (!disposition) return null;

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = disposition.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] || null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers = getRequestHeaders(options);

  const response = await fetch(url, {
    headers,
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

export async function apiGetBlob(path: string): Promise<BlobResponse> {
  const url = `${API_BASE_URL}${path}`;
  const headers = getRequestHeaders({
    headers: {
      Accept: "application/octet-stream,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json"
    }
  });

  const response = await fetch(url, {
    method: "GET",
    headers
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    let message = `HTTP ${response.status}`;

    if (errorText) {
      try {
        const parsed = JSON.parse(errorText);
        message = parsed?.message || message;
      } catch {
        message = errorText;
      }
    }

    throw new Error(message);
  }

  return {
    blob: await response.blob(),
    contentType: response.headers.get("content-type") || "application/octet-stream",
    fileName: getFilenameFromDisposition(response.headers.get("content-disposition"))
  };
}

export function downloadBlob(blob: Blob, fileName?: string | null) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || `download-${Date.now()}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
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
