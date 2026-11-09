import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  verifyToken,
  verifyPassword,
  hashPassword,
  validateNewPassword,
  needsRehash,
  SESSION_COOKIE,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

function currentUser() {
  return verifyToken(cookies().get(SESSION_COOKIE)?.value);
}

// Список сотрудников и состояние их паролей (директору — все, остальным — только себя)
export async function GET() {
  const me = currentUser();
  if (!me) return NextResponse.json({ error: "Нужно войти в систему" }, { status: 401 });

  const employees = await prisma.employee.findMany({
    where: me.role === "DIRECTOR" ? {} : { id: me.id },
    select: { id: true, name: true, login: true, roleTitle: true, isActive: true, passwordHash: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    me: { id: me.id, name: me.name, role: me.role },
    employees: employees.map((e) => ({
      id: e.id,
      name: e.name,
      login: e.login,
      roleTitle: e.roleTitle,
      isActive: e.isActive,
      hasPassword: Boolean(e.passwordHash),
      // старый формат = пароль ещё не меняли после обновления системы
      oldFormat: Boolean(e.passwordHash) && needsRehash(e.passwordHash),
    })),
  });
}

// Смена своего пароля или (для директора) пароля сотрудника
export async function POST(req: Request) {
  const me = currentUser();
  if (!me) return NextResponse.json({ error: "Нужно войти в систему" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const newPassword = String(body.newPassword || "");
  const targetId = body.employeeId ? String(body.employeeId) : me.id;
  const isSelf = targetId === me.id;

  if (!isSelf && me.role !== "DIRECTOR") {
    return NextResponse.json({ error: "Менять пароли сотрудников может только директор" }, { status: 403 });
  }

  const target = await prisma.employee.findUnique({ where: { id: targetId } });
  if (!target) return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 });

  if (isSelf) {
    const current = String(body.currentPassword || "");
    const ok =
      verifyPassword(current, target.passwordHash) ||
      verifyPassword(current.trim().toLowerCase(), target.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Текущий пароль указан неверно" }, { status: 400 });
    }
  }

  const problem = validateNewPassword(newPassword, target.login);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  if (verifyPassword(newPassword, target.passwordHash)) {
    return NextResponse.json({ error: "Новый пароль совпадает со старым" }, { status: 400 });
  }

  await prisma.employee.update({
    where: { id: target.id },
    data: { passwordHash: hashPassword(newPassword) },
  });

  return NextResponse.json({ success: true, name: target.name });
}
