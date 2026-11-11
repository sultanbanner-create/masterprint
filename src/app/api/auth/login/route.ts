import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword, needsRehash, createToken, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Удобные короткие имена для входа (на кириллице и по должности)
const LOGIN_ALIASES: Record<string, string> = {
  "тимур": "timur",
  "жалгас": "zhalgas",
  "абзал": "abzal",
  "альберт": "albert",
  "директор": "timur",
  "дизайнер": "zhalgas",
  "монтаж": "abzal",
  "печатник": "albert",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawLogin = String(body.login || "").trim();
    const rawPassword = String(body.password || "");

    if (!rawLogin || !rawPassword) {
      return NextResponse.json({ error: "Введите логин и пароль" }, { status: 400 });
    }

    const cleanLogin = rawLogin.toLowerCase();
    const targetLogin = LOGIN_ALIASES[cleanLogin] || cleanLogin;
    const cleanDigits = cleanLogin.replace(/\D/g, "");

    const employee = await prisma.employee.findFirst({
      where: {
        isActive: true,
        OR: [
          { login: targetLogin },
          { name: { equals: rawLogin, mode: "insensitive" } },
          ...(cleanDigits.length >= 9 ? [{ phone: { contains: cleanDigits.slice(-9) } }] : []),
        ],
      },
    });

    // Телефоны часто сами ставят заглавную первую букву — проверяем и такой вариант
    const candidates = Array.from(new Set([rawPassword, rawPassword.trim(), rawPassword.trim().toLowerCase()]));
    let matched: string | null = null;
    if (employee?.passwordHash) {
      for (const c of candidates) {
        if (verifyPassword(c, employee.passwordHash)) {
          matched = c;
          break;
        }
      }
    }

    if (!employee || !matched) {
      await sleep(700); // замедляем подбор пароля
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }

    // Переводим старый хеш на новый, более надёжный формат
    if (needsRehash(employee.passwordHash)) {
      try {
        await prisma.employee.update({
          where: { id: employee.id },
          data: { passwordHash: hashPassword(matched) },
        });
      } catch (e) {
        console.warn("[auth] Не удалось обновить формат пароля:", e);
      }
    }

    const user = {
      id: employee.id,
      login: employee.login || targetLogin,
      name: employee.name,
      role: employee.role,
      roleTitle: employee.roleTitle,
    };

    const response = NextResponse.json({ success: true, user });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: createToken(user),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Ошибка сервера при входе. Попробуйте ещё раз." }, { status: 500 });
  }
}
