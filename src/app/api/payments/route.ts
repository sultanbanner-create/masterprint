import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("mp_auth_session")?.value;
    const authUser = token ? verifyToken(token) : null;

    const isDirector = authUser?.role === "DIRECTOR";
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

    const status = isDirector ? "CONFIRMED" : "PENDING_CONFIRMATION";
    const acceptedBy = isDirector ? currentUserName : null;
    const acceptedAt = isDirector ? new Date() : null;

    const paymentNotes = notes || (isDirector 
      ? "Оплата принята в кассу" 
      : `Получено менеджером (${receivedBy}) — ожидает подтверждения в кассу`);

    const payment = await prisma.payment.create({
      data: {
        orderId: numOrderId,
        amount: numAmount,
        method,
        status,
        notes: paymentNotes,
        receivedBy,
        acceptedBy,
        acceptedAt,
      },
    });

    // Если подтверждено директором — сразу списываем долг
    if (status === "CONFIRMED") {
      const newPaid = order.paidAmount + numAmount;
      const newDebt = Math.max(0, order.totalAmount - newPaid);

      await prisma.order.update({
        where: { id: numOrderId },
        data: {
          paidAmount: newPaid,
          debtAmount: newDebt,
        },
      });

      return NextResponse.json({ success: true, payment, newPaid, newDebt, status });
    }

    // Если получил Жалгас — платеж ожидает подтверждения директором
    return NextResponse.json({ 
      success: true, 
      payment, 
      status: "PENDING_CONFIRMATION",
      message: "Оплата зарегистрирована менеджером и ожидает подтверждения директором в кассу" 
    });
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json({ error: "Ошибка при регистрации оплаты" }, { status: 500 });
  }
}
