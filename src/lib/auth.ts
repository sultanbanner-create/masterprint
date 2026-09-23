import crypto from "crypto";

const AUTH_SECRET = process.env.AUTH_SECRET || "masterprint_advertising_agency_secret_2026_jwt_salt";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + AUTH_SECRET).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export interface AuthUser {
  id: string;
  login: string;
  name: string;
  role: string;
  roleTitle: string;
}

export function createToken(payload: AuthUser): string {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  });
  const base64Data = Buffer.from(data).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(base64Data)
    .digest("base64url");
  return `${base64Data}.${signature}`;
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const [base64Data, signature] = token.split(".");
    if (!base64Data || !signature) return null;
    const expectedSignature = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(base64Data)
      .digest("base64url");
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(Buffer.from(base64Data, "base64url").toString());
    if (payload.exp && payload.exp < Date.now()) return null;
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
