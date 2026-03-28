
export interface ApiSuccessResponse<T> {
  status: "success";
  data: T;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: ValidationDetail[];
}

export interface ApiErrorResponse {
  status: "error";
  error: ApiErrorBody;
}

export interface ValidationDetail {
  field: string;
  message: string;
}
