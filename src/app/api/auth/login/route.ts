import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword, createToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawLogin = String(body.login || "").trim();
    const rawPassword = String(body.password || "").trim();

    if (!rawLogin || !rawPassword) {
      return NextResponse.json(
        { error: "Введите логин и пароль" },
        { status: 400 }
      );
    }

    const cleanLogin = rawLogin.toLowerCase();

    // Карта алиасов и кириллических транслитераций
    const LOGIN_ALIASES: Record<string, string> = {
      "тимур": "timur",
      "жалгас": "zhalgas",
      "абзал": "abzal",
      "альберт": "albert",
      "admin": "timur",
      "админ": "timur",
      "директор": "timur",
      "дизайн": "zhalgas",
      "дизайнер": "zhalgas",
      "сборка": "abzal",
      "монтаж": "abzal",
      "печать": "albert",
      "печатник": "albert",
    };

    const targetLogin = LOGIN_ALIASES[cleanLogin] || cleanLogin;
    const cleanDigits = cleanLogin.replace(/\D/g, "");

    // Поиск сотрудника по логину, алиасу, имени или телефону
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { login: targetLogin },
          { login: cleanLogin },
          { name: { equals: rawLogin, mode: "insensitive" } },
          ...(cleanDigits.length >= 7 ? [{ phone: { contains: cleanDigits } }] : []),
        ],
        isActive: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: `Сотрудник "${rawLogin}" не найден. Доступные логины: timur, zhalgas, abzal, albert` },
        { status: 401 }
      );
    }

    // Проверка пароля:
    // 1. Точное совпадение хеша
    // 2. Без учета регистра (например, авто-заглавная буква на телефоне: "Timur2026" -> "timur2026")
    // 3. Универсальные мастер-коды (быстрый пин "7777", "admin", "masterprint2026")
    // 4. Стандартные пароли ролей
    const isDirectMatch = employee.passwordHash ? verifyPassword(rawPassword, employee.passwordHash) : false;
    const isLowerMatch = employee.passwordHash ? verifyPassword(rawPassword.toLowerCase(), employee.passwordHash) : false;
    const isMasterPin = rawPassword === "7777" || rawPassword === "admin" || rawPassword === "masterprint2026";
    
    const isRolePassword =
      (employee.login === "timur" && (rawPassword.toLowerCase() === "timur2026" || isMasterPin)) ||
      (employee.login === "zhalgas" && (rawPassword.toLowerCase() === "zhalgas2026" || isMasterPin)) ||
      (employee.login === "abzal" && (rawPassword.toLowerCase() === "abzal2026" || isMasterPin)) ||
      (employee.login === "albert" && (rawPassword.toLowerCase() === "albert2026" || isMasterPin));

    const isValid = isDirectMatch || isLowerMatch || isMasterPin || isRolePassword;

    if (!isValid) {
      return NextResponse.json(
        { error: "Неверный пароль. Попробуйте еще раз или используйте быстрый вход ниже" },
        { status: 401 }
      );
    }

    // Если пароль подошел через дефолтный код, а в базе хеш отсутствовал или отличался — синхронизируем
    if ((isRolePassword || isMasterPin) && (!isDirectMatch && !isLowerMatch)) {
      try {
        const correctPass = employee.login + "2026";
        await prisma.employee.update({
          where: { id: employee.id },
          data: { passwordHash: hashPassword(correctPass) },
        });
      } catch (e) {
        console.warn("Could not sync employee password hash:", e);
      }
    }

    const user = {
      id: employee.id,
      login: employee.login || targetLogin,
      name: employee.name,
      role: employee.role,
      roleTitle: employee.roleTitle,
    };

    const token = createToken(user);

    const response = NextResponse.json({
      success: true,
      user,
    });

    response.cookies.set({
      name: "mp_auth_session",
      value: token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка сервера при авторизации" },
      { status: 500 }
    );
  }
}

