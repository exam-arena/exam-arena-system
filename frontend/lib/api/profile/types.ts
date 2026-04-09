export interface ProfileResponse {
  user_id: string;
  username: string;
  fullname: string;
  email: string;
  avatar_url: string;
  gender: string;
  date_of_birth: string;
  phone: string;
  province_code: string;
  province_name: string;
  ward_code: string;
  ward_name: string;
  address_detail: string;
  role: string;
  updated_at: string;
}

export interface UpdateProfilePayload {
  fullname: string;
  avatar_url: string;
  gender: string;
  date_of_birth: string;
  phone: string;
  province_code: string;
  province_name: string;
  ward_code: string;
  ward_name: string;
  address_detail: string;
}
