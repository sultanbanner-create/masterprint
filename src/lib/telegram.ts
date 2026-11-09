import crypto from "crypto";

/**
 * Секрет для вебхука Telegram. Передаётся боту при настройке (secret_token),
 * и Telegram присылает его в заголовке X-Telegram-Bot-Api-Secret-Token.
 * Так чужие запросы на адрес вебхука отбрасываются.
 */
export function webhookSecretFor(botToken: string): string {
  return crypto.createHmac("sha256", "mp-telegram-webhook").update(botToken).digest("hex").slice(0, 48);
}

/** Адрес сайта: из NEXT_PUBLIC_APP_URL или из текущего запроса. */
export function appBaseUrl(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

/** Токен бота: из настроек в базе или из TELEGRAM_BOT_TOKEN. Никаких токенов в коде. */
export function resolveBotToken(fromDb?: string | null): string | null {
  const token = (fromDb || process.env.TELEGRAM_BOT_TOKEN || "").trim();
  return token || null;
}
