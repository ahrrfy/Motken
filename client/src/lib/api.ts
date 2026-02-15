const MAX_RETRIES = 3;
const BASE_DELAY = 1000;
const TIMEOUT = 15000;

interface FetchOptions extends RequestInit {
  retries?: number;
  timeout?: number;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function apiFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const { retries = MAX_RETRIES, timeout = TIMEOUT, ...fetchOpts } = options;
  fetchOpts.credentials = fetchOpts.credentials || "include";

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, fetchOpts, timeout);
      return response;
    } catch (error: any) {
      lastError = error;
      if (error.name === "AbortError") {
        lastError = new Error("انتهت مهلة الاتصال بالخادم");
      }
      const method = (fetchOpts.method || "GET").toUpperCase();
      if (method !== "GET" || attempt === retries) {
        throw lastError;
      }
      await new Promise(resolve => setTimeout(resolve, BASE_DELAY * Math.pow(2, attempt)));
    }
  }
  throw lastError || new Error("فشل الاتصال");
}

export async function apiGet(url: string) {
  const res = await apiFetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: "خطأ في الخادم" }));
    throw new Error(data.message || `Error ${res.status}`);
  }
  return res.json();
}

export async function apiPost(url: string, body?: any) {
  const res = await apiFetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

export async function apiPatch(url: string, body: any) {
  const res = await apiFetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res;
}

export async function apiDelete(url: string) {
  const res = await apiFetch(url, { method: "DELETE" });
  return res;
}
