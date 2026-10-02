import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("mp_auth_session")?.value || cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

// DELETE: Удаление расхода (только авторизованный персонал)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
    }

    const { id } = params;
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Расход не найден" }, { status: 404 });
    }

    await prisma.expense.delete({ where: { id } });

    return NextResponse.json({ ok: true, message: "Расход успешно удален" });
  } catch (error: any) {
    console.error("[Delete Expense Error]:", error);
    return NextResponse.json({ error: "Ошибка при удалении расхода", details: error.message }, { status: 500 });
  }
}

// PATCH: Редактирование расхода
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();

    const data: any = {};
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.amount !== undefined) data.amount = Math.abs(Number(body.amount));
    if (body.category !== undefined) data.category = body.category;
    if (body.notes !== undefined) data.notes = body.notes ? body.notes.trim() : null;
    if (body.orderId !== undefined) {
      data.orderId = body.orderId ? Number(body.orderId) : null;
    }

    const updated = await prisma.expense.update({
      where: { id },
      data,
      include: {
        order: {
          select: { id: true, orderNumber: true, title: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[Patch Expense Error]:", error);
    return NextResponse.json({ error: "Ошибка при обновлении расхода", details: error.message }, { status: 500 });
  }
}
