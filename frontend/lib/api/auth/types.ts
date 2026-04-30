export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullname: string;
}

export interface LoginData {
  user: UserData;
}

export interface UserData {
  user_id: string;
  username: string;
  fullname: string;
  email: string;
  avatar_provider: string;
  avatar_key: string;
  avatar_url: string;
  role: string;
}
