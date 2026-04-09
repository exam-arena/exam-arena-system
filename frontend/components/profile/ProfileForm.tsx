"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import ProfileField from "./ProfileField";
import type {
  ProfileFormValues,
  ProvinceOption,
  WardOption,
} from "./types";

interface ProfileFormProps {
  values: ProfileFormValues;
  provinceOptions: ProvinceOption[];
  wardOptions: WardOption[];
  isLocationsLoading: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onFieldChange: (field: keyof ProfileFormValues, value: string) => void;
  onStartEditing: () => void;
  onSave: () => void;
}

const genderOptions = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
] as const;

const fieldInputClass =
  "h-12 rounded-full border-[#D8E6FF] bg-white px-4 !text-sm md:!text-sm !leading-5 text-[#004EDC] placeholder:text-[#92B8FF] focus-visible:border-[#004EDC] focus-visible:ring-[#004EDC]/20";

const fieldSelectClass =
  "h-12! w-full rounded-full border-[#D8E6FF] bg-white px-4 !text-sm md:!text-sm !leading-5 text-[#004EDC] data-placeholder:text-[#92B8FF] [&_[data-slot=select-value]]:!text-sm [&_[data-slot=select-value]]:!leading-5";

export default function ProfileForm({
  values,
  provinceOptions,
  wardOptions,
  isLocationsLoading,
  isEditing,
  isSaving,
  onFieldChange,
  onStartEditing,
  onSave,
}: ProfileFormProps) {
  return (
    <Card className="rounded-[2rem] border border-[#D8E6FF] bg-[#EAF2FF]/70 py-0 shadow-[0_18px_60px_rgba(0,78,220,0.08)] backdrop-blur">
      <CardContent className="px-6 py-6 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          <ProfileField label="Họ và tên">
            <Input
              value={values.fullname}
              onChange={(event) => onFieldChange("fullname", event.target.value)}
              disabled={!isEditing}
              placeholder="Nhập họ và tên thí sinh"
              className={fieldInputClass}
            />
          </ProfileField>

          <ProfileField label="Giới tính">
            <Select
              value={values.gender}
              onValueChange={(value) => onFieldChange("gender", value)}
              disabled={!isEditing}
            >
              <SelectTrigger className={fieldSelectClass}>
                <SelectValue placeholder="Chọn giới tính" />
              </SelectTrigger>
              <SelectContent>
                {genderOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ProfileField>

          <ProfileField label="Ngày sinh">
            <Input
              type="date"
              value={values.dateOfBirth}
              onChange={(event) =>
                onFieldChange("dateOfBirth", event.target.value)
              }
              disabled={!isEditing}
              className={fieldInputClass}
            />
          </ProfileField>

          <ProfileField label="Số điện thoại">
            <Input
              value={values.phone}
              onChange={(event) => onFieldChange("phone", event.target.value)}
              disabled={!isEditing}
              placeholder="Nhập số điện thoại"
              className={fieldInputClass}
            />
          </ProfileField>
        </div>

        <div className="mt-5 space-y-5">
          <ProfileField label="Email">
            <Input
              value={values.email}
              disabled
              readOnly
              placeholder="Email đang đăng nhập"
              className={cn(
                "h-12 rounded-full border-[#D8E6FF] px-4 text-sm! md:text-sm! leading-5! text-[#004EDC] placeholder:text-[#92B8FF] opacity-100 disabled:cursor-not-allowed disabled:opacity-100",
                isEditing
                  ? "bg-white disabled:text-[#004EDC] disabled:[-webkit-text-fill-color:#004EDC]"
                  : "bg-[#F7FAFF] disabled:text-[#92B8FF] disabled:[-webkit-text-fill-color:#92B8FF]"
              )}
            />
          </ProfileField>

          <ProfileField label="Tỉnh / thành phố">
            <Select
              value={values.provinceCode}
              onValueChange={(value) => onFieldChange("provinceCode", value)}
              disabled={!isEditing || isLocationsLoading}
            >
              <SelectTrigger className={fieldSelectClass}>
                <SelectValue
                  placeholder={
                    isLocationsLoading
                      ? "Đang tải tỉnh / thành phố..."
                      : "Chọn tỉnh / thành phố"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {provinceOptions.map((province) => (
                  <SelectItem key={province.code} value={province.code}>
                    {province.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ProfileField>

          <ProfileField label="Xã / phường">
            <Select
              value={values.wardCode}
              onValueChange={(value) => onFieldChange("wardCode", value)}
              disabled={!isEditing || !values.provinceCode || isLocationsLoading}
            >
              <SelectTrigger className={fieldSelectClass}>
                <SelectValue
                  placeholder={
                    !values.provinceCode
                      ? "Chọn tỉnh / thành phố trước"
                      : isLocationsLoading
                        ? "Đang tải xã / phường..."
                        : "Chọn xã / phường"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {wardOptions.map((ward) => (
                  <SelectItem key={ward.code} value={ward.code}>
                    {ward.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ProfileField>

          <ProfileField label="Địa chỉ cụ thể">
            <Input
              value={values.addressDetail}
              onChange={(event) =>
                onFieldChange("addressDetail", event.target.value)
              }
              disabled={!isEditing}
              placeholder="Số nhà, tên đường, thôn,ấp..."
              className={fieldInputClass}
            />
          </ProfileField>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onStartEditing}
            disabled={isEditing}
            className="h-12 w-full rounded-full border-[#BFD5FF] bg-white px-6 text-sm font-semibold text-[#004EDC] hover:border-[#004EDC] hover:bg-[#F5F9FF] hover:text-[#004EDC] sm:w-44"
          >
            Chỉnh sửa
          </Button>

          <Button
            type="button"
            onClick={onSave}
            disabled={!isEditing || isSaving}
            className="h-12 w-full rounded-full bg-[#004EDC] px-6 text-sm font-semibold text-white hover:bg-[#003DB1] sm:w-44"
          >
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
