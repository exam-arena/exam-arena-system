export type GenderOption = "male" | "female" | "other" | "";

export interface ProvinceOption {
  code: string;
  name: string;
}

export interface WardOption {
  code: string;
  name: string;
  provinceCode: string;
}

export interface ProfileFormValues {
  fullname: string;
  gender: GenderOption;
  dateOfBirth: string;
  phone: string;
  email: string;
  provinceCode: string;
  wardCode: string;
  addressDetail: string;
  avatarUrl: string;
}
