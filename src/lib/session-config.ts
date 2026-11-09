// Общие настройки сессии. Файл без Node-зависимостей:
// его импортирует и middleware (Edge), и серверный код (Node).

export const SESSION_COOKIE = "mp_auth_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней

/**
 * Исходная строка для секрета подписи сессий.
 * 1) AUTH_SECRET, если задан в переменных окружения (рекомендуется);
 * 2) иначе DATABASE_URL — он на сервере всегда секретный;
 * 3) иначе — только для локального запуска без базы.
 */
export function sessionSecretSource(): string {
  const explicit = process.env.AUTH_SECRET;
  if (explicit && explicit.length >= 16) return `mp-session:auth:${explicit}`;
  const db = process.env.DATABASE_URL;
  if (db) return `mp-session:db:${db}`;
  return "mp-session:local-dev-only";
}

/** Ключ для внешних интеграций (Jarvis). Только из переменной окружения. */
export function integrationApiKey(): string | null {
  const key = process.env.JARVIS_API_KEY;
  return key && key.length >= 24 ? key : null;
}
