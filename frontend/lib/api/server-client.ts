import type { ApiSuccessResponse, ApiErrorResponse } from "./shared/envelope";


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const REQUEST_TIMEOUT_MS = 10_000;

interface ServerRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
}

export async function serverApiRequest<T>(
  endpoint: string,
  options: ServerRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, token } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });

    const json = await response.json();

    if (!response.ok) {
      const errorData = json as ApiErrorResponse;
      throw new Error(errorData.error?.message || "Server error");
    }

    const successData = json as ApiSuccessResponse<T>;
    return successData.data;
  } finally {
    clearTimeout(timeoutId);
  }
}
