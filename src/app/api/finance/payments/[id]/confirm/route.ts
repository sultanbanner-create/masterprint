import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("mp_auth_session")?.value;
    const user = token ? verifyToken(token) : null;

    if (!user || user.role !== "DIRECTOR") {
      return NextResponse.json(
        { error: "Только руководитель (Тимур) может принимать и утверждать оплаты в кассу" },
        { status: 403 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: { order: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Платеж не найден" }, { status: 404 });
    }

    // Обновляем платеж
    const updatedPayment = await prisma.payment.update({
      where: { id: params.id },
      data: {
        status: "CONFIRMED",
        acceptedBy: user.name,
        acceptedAt: new Date(),
      },
    });

    // Если платеж привязан к заказу, пересчитываем оплаченную сумму и долг
    if (payment.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: payment.orderId },
        include: { payments: true },
      });

      if (order) {
        const confirmedPaid = order.payments
          .filter((p) => p.status === "CONFIRMED" || p.id === payment.id)
          .reduce((sum, p) => sum + p.amount, 0);

        const newDebt = Math.max(0, order.totalAmount - confirmedPaid);

        await prisma.order.update({
          where: { id: order.id },
          data: {
            paidAmount: confirmedPaid,
            debtAmount: newDebt,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
    });
  } catch (error: any) {
    console.error("Payment confirmation error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка подтверждения платежа" },
      { status: 500 }
    );
  }
}
