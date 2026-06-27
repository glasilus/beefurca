// Единый слой работы с API для веб-клиента.
// Поддерживает обе модели аутентификации бэкенда одновременно:
//  - Bearer-токен из localStorage (вход по паролю);
//  - httpOnly cookie (вход через Discord OAuth) — за счёт credentials: "include".
// Автоматически обновляет access-токен по refresh-токену при истечении 15-минутного TTL.

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

// Дедупликация: если уже идёт refresh, все конкурирующие запросы ждут его исхода.
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) {
          clearSession();
          return false;
        }
        const data = await res.json();
        if (data.accessToken) {
          localStorage.setItem("token", data.accessToken);
          if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
          return true;
        }
        clearSession();
        return false;
      } catch {
        clearSession();
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

// Пути, для которых не нужно пробовать refresh при 401.
const SKIP_REFRESH = new Set(["/auth/refresh", "/auth/logout", "/auth/login", "/auth/register"]);

async function _apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
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
 * Обёртка над fetch: добавляет базовый URL, Bearer-заголовок (если есть токен),
 * Content-Type для JSON-тел и ВСЕГДА credentials: "include" (для cookie-сессий).
 * При 401 автоматически пробует обновить токен через /auth/refresh и повторяет запрос.
 */
export async function apiFetch(
  path: string,
  opts: RequestInit = {}
): Promise<Response> {
  const res = await _apiFetch(path, opts);

  if (res.status === 401 && !SKIP_REFRESH.has(path.split("?")[0])) {
    const refreshed = await tryRefreshToken();
    if (refreshed) return _apiFetch(path, opts);
  }

  return res;
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
