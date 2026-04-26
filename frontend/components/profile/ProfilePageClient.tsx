"use client";

import { useEffect, useMemo, useState } from "react";

import ProfileForm from "@/components/profile/ProfileForm";
import ProfileIdentityCard from "@/components/profile/ProfileIdentityCard";
import type {
  GenderOption,
  ProfileFormValues,
  ProvinceOption,
  WardOption,
} from "@/components/profile/types";
import { signAvatarUploadApi, updateAvatarApi } from "@/lib/api/profile/avatar";
import { getProfileApi, updateProfileApi } from "@/lib/api/profile/api";
import type {
  ProfileResponse,
  UpdateProfilePayload,
} from "@/lib/api/profile/types";
import {
  getProvinceOptions,
  getWardOptionsByProvinceCode,
  normalizeLocationCode,
} from "@/lib/api/provinces/api";
import { ApiError } from "@/lib/api/shared/errors";
import { useAuth } from "@/lib/auth/hooks";

const objectUrlFactory = typeof URL !== "undefined" ? URL : null;

function buildInitialValues(fullname: string, email: string): ProfileFormValues {
  return {
    fullname,
    gender: "",
    dateOfBirth: "",
    phone: "",
    email,
    provinceCode: "",
    wardCode: "",
    addressDetail: "",
    avatarUrl: "",
  };
}

function toGenderOption(value: string): GenderOption {
  if (value === "male" || value === "female" || value === "other") {
    return value;
  }
  return "";
}

function mapProfileToFormValues(profile: ProfileResponse): ProfileFormValues {
  return {
    fullname: profile.fullname ?? "",
    gender: toGenderOption(profile.gender),
    dateOfBirth: profile.date_of_birth ?? "",
    phone: profile.phone ?? "",
    email: profile.email ?? "",
    provinceCode: normalizeLocationCode(profile.province_code ?? ""),
    wardCode: normalizeLocationCode(profile.ward_code ?? ""),
    addressDetail: profile.address_detail ?? "",
    avatarUrl: profile.avatar_url ?? "",
  };
}

function buildUpdatePayload(
  values: ProfileFormValues,
  provinceOptions: ProvinceOption[],
  wardOptions: WardOption[]
): UpdateProfilePayload {
  const normalizedProvinceCode = normalizeLocationCode(values.provinceCode);
  const normalizedWardCode = normalizeLocationCode(values.wardCode);
  const province = provinceOptions.find(
    (item) => item.code === normalizedProvinceCode
  );
  const ward = wardOptions.find((item) => item.code === normalizedWardCode);

  return {
    fullname: values.fullname.trim(),
    avatar_url: values.avatarUrl.trim(),
    gender: values.gender,
    date_of_birth: values.dateOfBirth,
    phone: values.phone.trim(),
    province_code: normalizedProvinceCode,
    province_name: province?.name ?? "",
    ward_code: normalizedWardCode,
    ward_name: ward?.name ?? "",
    address_detail: values.addressDetail.trim(),
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.details?.length) {
      return error.details.map((item) => item.message).join(" ");
    }
    return error.message;
  }

  return "Không thể tải hồ sơ lúc nay. Vui lòng thử lại.";
}

async function uploadAvatarToCloudinary(file: File): Promise<{
  provider: string;
  key: string;
  url: string;
}> {
  const signature = await signAvatarUploadApi();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signature.api_key);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("folder", signature.folder);
  formData.append("public_id", signature.public_id);

  const response = await fetch(signature.upload_url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Avatar upload failed");
  }

  const payload = (await response.json()) as {
    public_id?: string;
    secure_url?: string;
  };
  if (!payload.public_id || !payload.secure_url) {
    throw new Error("Avatar upload failed");
  }

  return {
    provider: signature.provider,
    key: payload.public_id,
    url: payload.secure_url,
  };
}

export default function ProfilePageClient() {
  const { user, updateUser } = useAuth();

  const fallbackValues = useMemo(
    () => buildInitialValues(user?.fullname ?? "", user?.email ?? ""),
    [user?.email, user?.fullname]
  );

  const [formValues, setFormValues] = useState<ProfileFormValues>(fallbackValues);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isLocationsLoading, setIsLocationsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [avatarErrorMessage, setAvatarErrorMessage] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [provinceOptions, setProvinceOptions] = useState<ProvinceOption[]>([]);
  const [wardOptions, setWardOptions] = useState<WardOption[]>([]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl && objectUrlFactory) {
        objectUrlFactory.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  useEffect(() => {
    let cancelled = false;

    const loadProvinces = async () => {
      setIsLocationsLoading(true);
      try {
        const provinces = await getProvinceOptions();
        if (!cancelled) {
          setProvinceOptions(provinces);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(
            "Không thể tải danh sách tỉnh / thành sau khi nhập lúc này."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLocationsLoading(false);
        }
      }
    };

    void loadProvinces();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setFormValues(fallbackValues);
      setIsFetching(false);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setIsFetching(true);
      setErrorMessage("");

      try {
        const profile = await getProfileApi();
        if (!cancelled) {
          setFormValues(mapProfileToFormValues(profile));
        }
      } catch (error) {
        if (!cancelled) {
          setFormValues(fallbackValues);
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [fallbackValues, user]);

  useEffect(() => {
    const normalizedProvinceCode = normalizeLocationCode(formValues.provinceCode);
    if (!normalizedProvinceCode) {
      setWardOptions([]);
      return;
    }

    let cancelled = false;

    const loadWards = async () => {
      setIsLocationsLoading(true);
      try {
        const wards = await getWardOptionsByProvinceCode(normalizedProvinceCode);
        if (!cancelled) {
          setWardOptions(wards);
          const normalizedWardCode = normalizeLocationCode(formValues.wardCode);
          const wardExists = wards.some((ward) => ward.code === normalizedWardCode);
          if (!wardExists) {
            setFormValues((current) => ({
              ...current,
              provinceCode: normalizedProvinceCode,
              wardCode: "",
            }));
          }
        }
      } catch {
        if (!cancelled) {
          setWardOptions([]);
          setErrorMessage(
            "Không thể tải danh sách xã / phường sau khi nhập lúc này."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLocationsLoading(false);
        }
      }
    };

    void loadWards();

    return () => {
      cancelled = true;
    };
  }, [formValues.provinceCode, formValues.wardCode]);

  if (!user) {
    return null;
  }

  const handleFieldChange = (field: keyof ProfileFormValues, value: string) => {
    setErrorMessage("");
    setFormValues((current) => {
      if (field === "provinceCode") {
        return {
          ...current,
          provinceCode: normalizeLocationCode(value),
          wardCode: "",
        };
      }

      return {
        ...current,
        [field]: field === "wardCode" ? normalizeLocationCode(value) : value,
      };
    });
  };

  const handleStartEditing = () => {
    setErrorMessage("");
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage("");

    try {
      const updatedProfile = await updateProfileApi(
        buildUpdatePayload(formValues, provinceOptions, wardOptions)
      );
      setFormValues(mapProfileToFormValues(updatedProfile));
      updateUser(updatedProfile);
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarSelect = async (file: File) => {
    setAvatarErrorMessage("");

    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarErrorMessage("Ảnh đại diện chỉ hỗ trợ JPG, PNG hoặc WEBP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarErrorMessage("Ảnh đại diện phải nhỏ hơn hoặc bằng 2MB.");
      return;
    }

    const previewUrl = objectUrlFactory?.createObjectURL(file) ?? "";
    if (avatarPreviewUrl && objectUrlFactory) {
      objectUrlFactory.revokeObjectURL(avatarPreviewUrl);
    }
    setAvatarPreviewUrl(previewUrl);
    setIsUploadingAvatar(true);

    try {
      const uploadedAvatar = await uploadAvatarToCloudinary(file);
      const updatedProfile = await updateAvatarApi({
        avatar_provider: uploadedAvatar.provider,
        avatar_key: uploadedAvatar.key,
        avatar_url: uploadedAvatar.url,
      });
      setFormValues(mapProfileToFormValues(updatedProfile));
      updateUser(updatedProfile);
      if (previewUrl && objectUrlFactory) {
        objectUrlFactory.revokeObjectURL(previewUrl);
      }
      setAvatarPreviewUrl("");
    } catch (error) {
      setAvatarErrorMessage(getErrorMessage(error));
      if (previewUrl && objectUrlFactory) {
        objectUrlFactory.revokeObjectURL(previewUrl);
      }
      setAvatarPreviewUrl("");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const currentAvatarUrl = avatarPreviewUrl || formValues.avatarUrl || user.avatar_url;

  return (
    <section className="bg-[#F6FBFF] px-4 py-10 sm:px-6 lg:px-24 lg:py-14">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#004EDC] sm:text-4xl">
            Hồ sơ cá nhân
          </h1>
          {isFetching ? (
            <p className="text-sm text-[#5B84D7]">Đang tải thông tin hồ sơ...</p>
          ) : null}
          {errorMessage ? (
            <p className="text-sm font-medium text-[#D14343]">{errorMessage}</p>
          ) : null}
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <ProfileIdentityCard
            fullname={formValues.fullname}
            username={user.username}
            userId={user.user_id}
            avatarUrl={currentAvatarUrl}
            isEditing={isEditing}
            isUploadingAvatar={isUploadingAvatar}
            avatarError={avatarErrorMessage}
            onAvatarSelect={handleAvatarSelect}
          />

          <ProfileForm
            values={formValues}
            provinceOptions={provinceOptions}
            wardOptions={wardOptions}
            isLocationsLoading={isLocationsLoading}
            isEditing={isEditing}
            isSaving={isSaving}
            onFieldChange={handleFieldChange}
            onStartEditing={handleStartEditing}
            onSave={handleSave}
          />
        </div>
      </div>
    </section>
  );
}
