// Проверка подписи сессии в middleware (Edge runtime, Web Crypto).
// Должна давать тот же результат, что createToken() в src/lib/auth.ts.

import { sessionSecretSource } from "./session-config";

export interface SessionPayload {
  id: string;
  login: string;
  name: string;
  role: string;
  roleTitle: string;
  exp: number;
}

const encoder = new TextEncoder();
let cachedSource = "";
let cachedKey: Promise<CryptoKey> | null = null;

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64UrlToText(str: string): string {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function getKey(): Promise<CryptoKey> {
  const source = sessionSecretSource();
  if (!cachedKey || cachedSource !== source) {
    cachedSource = source;
    cachedKey = (async () => {
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(source)));
      const secretHex = toHex(digest);
      return crypto.subtle.importKey(
        "raw",
        encoder.encode(secretHex),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
    })();
  }
  return cachedKey;
}

export async function verifySessionEdge(token: string | undefined | null): Promise<SessionPayload | null> {
  try {
    if (!token) return null;
    const [data, signature] = token.split(".");
    if (!data || !signature) return null;
    const key = await getKey();
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
    if (!constantTimeEqual(toBase64Url(mac), signature)) return null;
    const payload = JSON.parse(fromBase64UrlToText(data)) as SessionPayload;
    if (!payload || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
