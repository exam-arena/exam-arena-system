import type { ApiSuccessResponse, ApiErrorResponse } from "./shared/envelope";
import { ApiError } from "./shared/errors";
import { getToken } from "../auth/token";


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const REQUEST_TIMEOUT_MS = 10_000;

export { ApiError };

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, auth = false } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (auth) {
    const token = getToken();
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      credentials: "include",
    });

    const json = await response.json();

    if (!response.ok) {
      const errorData = json as ApiErrorResponse;
      throw new ApiError(
        errorData.error?.code || "UNKNOWN_ERROR",
        errorData.error?.message || "Something went wrong",
        response.status,
        errorData.error?.details
      );
    }

    const successData = json as ApiSuccessResponse<T>;
    return successData.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("TIMEOUT", "Request timed out", 408);
    }

    throw new ApiError(
      "NETWORK_ERROR",
      "Unable to connect to server",
      0
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
