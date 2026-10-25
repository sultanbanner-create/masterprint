import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { getOrCreateUlugbekClient } from "@/lib/nukus-boxes";

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("mp_auth_session")?.value;
    const currentUser = token ? verifyToken(token) : null;

    // Вносить оплату может руководитель или менеджер, но списание долга происходит ТОЛЬКО после подтверждения Админом
    if (currentUser && currentUser.role !== "DIRECTOR" && currentUser.role !== "SALES_DESIGNER") {
      return NextResponse.json(
        { error: "Только руководитель или менеджер может регистрировать оплату" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { amount, method = "CASH", notes } = body as {
      amount: number;
      method?: string;
      notes?: string;
    };

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Укажите корректную сумму платежа (больше нуля)" },
        { status: 400 }
      );
    }

    const ulugbek = await getOrCreateUlugbekClient();

    // Получаем все заказы Улугбека с открытым долгом
    const debtorOrders = await prisma.order.findMany({
      where: {
        clientId: ulugbek.id,
        debtAmount: { gt: 0 },
      },
      orderBy: { createdAt: "asc" },
    });

    if (debtorOrders.length === 0) {
      return NextResponse.json(
        { error: "У клиента Улугбек («Нукус гуллери») нет неоплаченных заказов. Текущий долг равен нулю." },
        { status: 400 }
      );
    }

    const currentTotalDebt = debtorOrders.reduce((sum, o) => sum + o.debtAmount, 0);

    // Создаем запись платежа со статусом PENDING_CONFIRMATION (Ожидает подтверждения Админа)
    // Долг НЕ списывается сразу, чтобы избежать случайных ошибок!
    const cleanNote = notes?.trim()
      ? `[NUKUS_BOXES] ${notes.trim()}`
      : `[NUKUS_BOXES] Оплата за коробки от клиента Улугбек («Нукус гуллери»)`;

    const payment = await prisma.payment.create({
      data: {
        orderId: debtorOrders[0].id,
        amount: Number(amount),
        method: method.toUpperCase(),
        status: "PENDING_CONFIRMATION",
        receivedBy: currentUser?.name || "Тимур",
        acceptedBy: null,
        acceptedAt: null,
        notes: cleanNote,
      },
    });

    return NextResponse.json({
      success: true,
      status: "PENDING_CONFIRMATION",
      message: `⏳ Оплата ${Number(amount).toLocaleString("ru-RU")} сум зафиксирована! Пожалуйста, проверьте сумму и нажмите «Подтвердить оплату» в блоке подтверждения Админа, чтобы списать долг.`,
      paymentId: payment.id,
      amount: Number(amount),
      updatedTotalDebt: currentTotalDebt,
    });
  } catch (error: any) {
    console.error("Error processing Ulugbek payment:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при регистрации оплаты" },
      { status: 500 }
    );
  }
}
