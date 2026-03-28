
const TOKEN_KEY = "exam_arena_token";
const COOKIE_NAME = "ea_auth";

let memoryToken: string | null = null;

export function getToken(): string | null {
  if (memoryToken) return memoryToken;

  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) memoryToken = stored;
  return memoryToken;
}

export function setToken(token: string): void {
  memoryToken = token;
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
    document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  }
}

export function removeToken(): void {
  memoryToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  }
}
