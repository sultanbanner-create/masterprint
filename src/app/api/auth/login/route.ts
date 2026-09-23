import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { login, password } = await req.json();

    if (!login || !password) {
      return NextResponse.json(
        { error: "Введите логин и пароль" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findFirst({
      where: {
        login: login.trim().toLowerCase(),
        isActive: true,
      },
    });

    if (!employee || !employee.passwordHash) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, employee.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    const user = {
      id: employee.id,
      login: employee.login || login,
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
