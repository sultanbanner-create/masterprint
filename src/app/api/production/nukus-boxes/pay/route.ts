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

    // Вносить оплату и списывать долг может только директор или менеджер
    if (currentUser && currentUser.role !== "DIRECTOR" && currentUser.role !== "SALES_DESIGNER") {
      return NextResponse.json(
        { error: "Только руководитель или менеджер может принимать оплату и гасить долг" },
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

    let remainingPayment = amount;
    const affectedOrders: number[] = [];

    for (const order of debtorOrders) {
      if (remainingPayment <= 0) break;

      const toPay = Math.min(order.debtAmount, remainingPayment);
      const newPaid = order.paidAmount + toPay;
      const newDebt = Math.max(0, order.debtAmount - toPay);
      const newStatus = newDebt === 0 && order.status === "READY" ? "COMPLETED" : order.status;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paidAmount: newPaid,
          debtAmount: newDebt,
          status: newStatus,
        },
      });

      affectedOrders.push(order.id);
      remainingPayment -= toPay;
    }

    // Создаем запись платежа в кассу
    const payment = await prisma.payment.create({
      data: {
        orderId: affectedOrders[0] || debtorOrders[0].id,
        amount,
        method: method.toUpperCase(),
        status: "CONFIRMED",
        receivedBy: currentUser?.name || "Тимур",
        acceptedBy: "Тимур (Руководитель)",
        acceptedAt: new Date(),
        notes:
          notes ||
          `Погашение задолженности за коробки от клиента Улугбек («Нукус гуллери»). Погашено заказов: ${affectedOrders.length}`,
      },
    });

    // Рассчитываем актуальный остаток долга
    const remainingOrders = await prisma.order.findMany({
      where: { clientId: ulugbek.id },
      select: { debtAmount: true },
    });
    const updatedTotalDebt = remainingOrders.reduce((sum, o) => sum + o.debtAmount, 0);

    return NextResponse.json({
      success: true,
      message: `Оплата ${amount.toLocaleString()} сум успешно принята в кассу! Новый долг Улугбека: ${updatedTotalDebt.toLocaleString()} сум.`,
      paymentId: payment.id,
      amount,
      updatedTotalDebt,
      affectedOrdersCount: affectedOrders.length,
    });
  } catch (error: any) {
    console.error("Error processing Ulugbek payment:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при регистрации оплаты" },
      { status: 500 }
    );
  }
}
