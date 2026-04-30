import { apiRequest } from "../client";
import type { LoginData, LoginRequest, RegisterRequest, UserData } from "./types";


export async function loginApi(
  identifier: string,
  password: string
): Promise<LoginData> {
  const body: LoginRequest = { identifier, password };
  return apiRequest<LoginData>("/api/v1/auth/login", {
    method: "POST",
    body,
  });
}

export async function registerApi(
  data: RegisterRequest
): Promise<void> {
  await apiRequest<{ message: string }>("/api/v1/auth/register", {
    method: "POST",
    body: data,
  });
}

export async function getMeApi(): Promise<UserData> {
  return apiRequest<UserData>("/api/v1/auth/me");
}

export async function logoutApi(): Promise<void> {
  await apiRequest<{ message: string }>("/api/v1/auth/logout", {
    method: "POST",
  });
}
