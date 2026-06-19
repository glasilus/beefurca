// Единый слой работы с API для веб-клиента.
// Поддерживает обе модели аутентификации бэкенда одновременно:
//  - Bearer-токен из localStorage (вход по паролю);
//  - httpOnly cookie (вход через Discord OAuth) — за счёт credentials: "include".

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function getStoredUser(): any | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export function setSession(user: any, token?: string) {
  if (user) localStorage.setItem("user", JSON.stringify(user));
  if (token) localStorage.setItem("token", token);
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

/**
 * Обёртка над fetch: добавляет базовый URL, Bearer-заголовок (если есть токен),
 * Content-Type для JSON-тел и ВСЕГДА credentials: "include" (для cookie-сессий).
 */
export async function apiFetch(
  path: string,
  opts: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(opts.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (
    opts.body &&
    typeof opts.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_URL}${path}`, {
    ...opts,
    headers,
    credentials: "include",
  });
}

/**
 * Возвращает профиль текущего пользователя (через Bearer ИЛИ cookie) либо null.
 * Используется как guard на защищённых страницах: работает и для Discord-входа,
 * у которого нет токена в localStorage.
 */
export async function fetchProfile(): Promise<any | null> {
  try {
    const res = await apiFetch("/users/me");
    if (!res.ok) return null;
    const data = await res.json();
    return data.profile || null;
  } catch {
    return null;
  }
}

export async function logout() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    /* игнорируем — всё равно чистим локальную сессию */
  }
  clearSession();
}
