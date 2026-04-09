import type {
  ProfileResponse,
  UpdateProfilePayload,
} from "./types";

import { apiRequest } from "../client";

export async function getProfileApi(): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>("/api/v1/profile");
}

export async function updateProfileApi(
  payload: UpdateProfilePayload
): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>("/api/v1/profile", {
    method: "PUT",
    body: payload,
  });
}
