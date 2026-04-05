import type { ApiSuccessResponse, ApiErrorResponse } from "./shared/envelope";


const API_BASE_URL =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080";

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
      credentials: "include",
    });

    const raw = await response.text();
    const contentType = response.headers.get("content-type") || "";
    const isJSON = contentType.toLowerCase().includes("application/json");
    const json = raw && isJSON ? JSON.parse(raw) : null;

    if (!response.ok) {
      const errorData = json as ApiErrorResponse | null;
      throw new Error(
        errorData?.error?.message ||
          raw ||
          `Request failed with status ${response.status}`
      );
    }

    const successData = json as ApiSuccessResponse<T> | null;
    if (!successData || successData.status !== "success") {
      throw new Error(
        raw && !isJSON ? raw : "Server returned an invalid response"
      );
    }

    return successData.data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Server returned an invalid response");
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out");
    }

    if (error instanceof TypeError) {
      throw new Error("Unable to connect to server");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
