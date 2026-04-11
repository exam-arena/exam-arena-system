import { apiRequest } from "../client";
import type {
  AvatarUploadSignatureResponse,
  ProfileResponse,
  UpdateAvatarPayload,
} from "./types";

export async function signAvatarUploadApi(): Promise<AvatarUploadSignatureResponse> {
  return apiRequest<AvatarUploadSignatureResponse>("/api/v1/profile/avatar/sign", {
    method: "POST",
  });
}

export async function updateAvatarApi(
  payload: UpdateAvatarPayload
): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>("/api/v1/profile/avatar", {
    method: "PUT",
    body: payload,
  });
}
