import type { ProvinceOption, WardOption } from "@/components/profile/types";
import type {
  ProvinceApiResponse,
  ProvinceDetailApiResponse,
} from "./types";

const PROVINCES_API_BASE_URL = "https://provinces.open-api.vn/api/v2";

let provincesCache: ProvinceOption[] | null = null;
let provincesPromise: Promise<ProvinceOption[]> | null = null;

const wardsCache = new Map<string, WardOption[]>();
const wardPromises = new Map<string, Promise<WardOption[]>>();

function normalizeCode(code: string | number | null | undefined): string {
  if (code === null || code === undefined) {
    return "";
  }

  const value = String(code).trim();
  if (!value) {
    return "";
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? String(numericValue) : value;
}

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getProvinceOptions(): Promise<ProvinceOption[]> {
  if (provincesCache) {
    return provincesCache;
  }

  if (!provincesPromise) {
    provincesPromise = requestJson<ProvinceApiResponse[]>(
      `${PROVINCES_API_BASE_URL}/p/`
    )
      .then((items) =>
        items.map((item) => ({
          code: normalizeCode(item.code),
          name: item.name,
        }))
      )
      .then((items) => {
        provincesCache = items;
        return items;
      })
      .finally(() => {
        provincesPromise = null;
      });
  }

  return provincesPromise;
}

export async function getWardOptionsByProvinceCode(
  provinceCode: string
): Promise<WardOption[]> {
  const normalizedProvinceCode = normalizeCode(provinceCode);
  if (!normalizedProvinceCode) {
    return [];
  }

  const cachedWards = wardsCache.get(normalizedProvinceCode);
  if (cachedWards) {
    return cachedWards;
  }

  const inFlightRequest = wardPromises.get(normalizedProvinceCode);
  if (inFlightRequest) {
    return inFlightRequest;
  }

  const request = requestJson<ProvinceDetailApiResponse>(
    `${PROVINCES_API_BASE_URL}/p/${normalizedProvinceCode}?depth=2`
  )
    .then((province) =>
      (province.wards ?? []).map((ward) => ({
        code: normalizeCode(ward.code),
        name: ward.name,
        provinceCode: normalizeCode(ward.province_code),
      }))
    )
    .then((wards) => {
      wardsCache.set(normalizedProvinceCode, wards);
      return wards;
    })
    .finally(() => {
      wardPromises.delete(normalizedProvinceCode);
    });

  wardPromises.set(normalizedProvinceCode, request);
  return request;
}

export function normalizeLocationCode(code: string): string {
  return normalizeCode(code);
}
