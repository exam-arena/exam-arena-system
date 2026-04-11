import type { ApiSuccessResponse, ApiErrorResponse } from "./shared/envelope";
import { ApiError } from "./shared/errors";


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

async function getServerCookieHeader(): Promise<string | null> {
  if (typeof window !== "undefined") {
    return null;
  }

  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const serialized = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    return serialized || null;
  } catch {
    return null;
  }
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

  const cookieHeader = await getServerCookieHeader();
  if (cookieHeader && !requestHeaders.Cookie) {
    requestHeaders.Cookie = cookieHeader;
  }

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
      throw new ApiError(
        errorData?.error?.code || "UNKNOWN_ERROR",
        errorData?.error?.message ||
          raw ||
          `Request failed with status ${response.status}`,
        response.status,
        errorData?.error?.details
      );
    }

    const successData = json as ApiSuccessResponse<T> | null;
    if (!successData || successData.status !== "success") {
      throw new ApiError(
        "INVALID_RESPONSE",
        raw && !isJSON ? raw : "Server returned an invalid response"
        ,
        response.status
      );
    }

    return successData.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new ApiError("INVALID_RESPONSE", "Server returned an invalid response", 0);
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("TIMEOUT", "Request timed out", 408);
    }

    if (error instanceof TypeError) {
      throw new ApiError("NETWORK_ERROR", "Unable to connect to server", 0);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
