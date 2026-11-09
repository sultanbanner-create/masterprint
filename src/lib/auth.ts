import crypto from "crypto";
import { SESSION_COOKIE, SESSION_TTL_MS, sessionSecretSource } from "./session-config";

export { SESSION_COOKIE };

/**
 * Секрет подписи сессий.
 * Берётся из AUTH_SECRET, а если он не задан — выводится из DATABASE_URL,
 * который на Vercel всегда секретный. Старый общий ключ из кода больше
 * не используется: он был опубликован в открытом репозитории.
 */
function getSessionSecret(): string {
  const source = sessionSecretSource();
  return crypto.createHash("sha256").update(source).digest("hex");
}

/* ------------------------------------------------------------------ */
/* Пароли                                                              */
/* ------------------------------------------------------------------ */

// Соль старых хешей (sha256). Нужна только чтобы один раз проверить
// старый пароль и сразу перевести его на новый формат.
const LEGACY_PASSWORD_SALT = "masterprint_advertising_agency_secret_2026_jwt_salt";

// Старый код солил пароль переменной AUTH_SECRET (если была задана) или общей строкой.
function legacyHashes(password: string): string[] {
  const salts = Array.from(new Set([process.env.AUTH_SECRET, LEGACY_PASSWORD_SALT].filter(Boolean) as string[]));
  return salts.map((salt) => crypto.createHash("sha256").update(password + salt).digest("hex"));
}

/** Новый формат: scrypt$<соль hex>$<хеш hex> */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length === 0 || ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored || !password) return false;
  if (stored.startsWith("scrypt$")) {
    const [, saltHex, hashHex] = stored.split("$");
    if (!saltHex || !hashHex) return false;
    const hash = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), hashHex.length / 2);
    return safeEqualHex(hash.toString("hex"), hashHex);
  }
  // Старый формат
  return legacyHashes(password).some((h) => safeEqualHex(h, stored));
}

export function needsRehash(stored: string | null | undefined): boolean {
  return !stored || !stored.startsWith("scrypt$");
}

/** Простые проверки нового пароля. Возвращает текст ошибки или null. */
export function validateNewPassword(password: string, login?: string | null): string | null {
  if (password.length < 8) return "Пароль должен быть не короче 8 символов";
  if (password.length > 128) return "Пароль слишком длинный";
  const lower = password.toLowerCase();
  const weak = ["12345678", "password", "qwerty12", "masterprint", "11111111", "00000000"];
  if (weak.some((w) => lower.includes(w))) return "Пароль слишком простой, придумайте другой";
  if (login && lower.startsWith(login.toLowerCase())) return "Пароль не должен начинаться с логина";
  return null;
}

/* ------------------------------------------------------------------ */
/* Сессии                                                              */
/* ------------------------------------------------------------------ */

export interface AuthUser {
  id: string;
  login: string;
  name: string;
  role: string;
  roleTitle: string;
}

export function createToken(payload: AuthUser): string {
  const data = JSON.stringify({
    id: payload.id,
    login: payload.login,
    name: payload.name,
    role: payload.role,
    roleTitle: payload.roleTitle,
    exp: Date.now() + SESSION_TTL_MS,
  });
  const base64Data = Buffer.from(data).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(base64Data)
    .digest("base64url");
  return `${base64Data}.${signature}`;
}

export function verifyToken(token: string | null | undefined): AuthUser | null {
  try {
    if (!token) return null;
    const [base64Data, signature] = token.split(".");
    if (!base64Data || !signature) return null;
    const expected = crypto
      .createHmac("sha256", getSessionSecret())
      .update(base64Data)
      .digest("base64url");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(base64Data, "base64url").toString());
    if (!payload.exp || payload.exp < Date.now()) return null;
    return {
      id: payload.id,
      login: payload.login,
      name: payload.name,
      role: payload.role,
      roleTitle: payload.roleTitle,
    };
  } catch {
    return null;
  }
}
