export interface ProvinceApiResponse {
  code: number;
  name: string;
}

export interface WardApiResponse {
  code: number;
  name: string;
  province_code: number;
}

export interface ProvinceDetailApiResponse extends ProvinceApiResponse {
  wards?: WardApiResponse[];
}
