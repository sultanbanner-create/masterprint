import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("mp_auth_session")?.value;
    const authUser = token ? verifyToken(token) : null;

    const currentUserName = authUser?.name || "Жалгас";

    const body = await req.json();
    const { orderId, amount, method = "CASH", notes, receivedBy = currentUserName } = body;

    const numOrderId = parseInt(orderId);
    const numAmount = Number(amount);

    if (isNaN(numOrderId) || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Некорректная сумма платежа" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: numOrderId } });
    if (!order) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });

    // Все платежи сначала создаются со статусом PENDING_CONFIRMATION (Ожидает подтверждения Админа),
    // чтобы избежать случайного списания долга по ошибке!
    const status = "PENDING_CONFIRMATION";
    const paymentNotes = notes || `Оплата от клиента (${receivedBy}) — ожидает подтверждения Админа`;

    const payment = await prisma.payment.create({
      data: {
        orderId: numOrderId,
        amount: numAmount,
        method,
        status,
        notes: paymentNotes,
        receivedBy,
        acceptedBy: null,
        acceptedAt: null,
      },
    });

    return NextResponse.json({ 
      success: true, 
      payment, 
      status: "PENDING_CONFIRMATION",
      message: "⏳ Оплата зафиксирована и ожидает подтверждения Администратором (Тимуром) для списания долга и зачисления в кассу." 
    });
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json({ error: "Ошибка при регистрации оплаты" }, { status: 500 });
  }
}
