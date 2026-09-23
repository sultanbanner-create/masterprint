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

        // Автоматический перевод наряда в цех мастеру при подтверждении оплаты Тимуром
        let nextStatus = order.status;
        let nextAssignedToId = order.assignedToId;

        if (order.status === "NEW" || order.status === "DESIGN") {
          const orderWithItems = await prisma.order.findUnique({
            where: { id: order.id },
            include: { items: true },
          });

          const hasPrint = orderWithItems?.items.some(
            (it) => it.serviceType === "BANNER" || it.serviceType === "ORACAL"
          );
          const [albert, abzal] = await Promise.all([
            prisma.employee.findFirst({ where: { name: "Альберт" } }),
            prisma.employee.findFirst({ where: { name: "Абзал" } }),
          ]);

          if (hasPrint && albert) {
            nextStatus = "PRINTING";
            nextAssignedToId = albert.id;
          } else if (abzal) {
            nextStatus = "ASSEMBLY";
            nextAssignedToId = abzal.id;
          }
        }

        await prisma.order.update({
          where: { id: order.id },
          data: {
            paidAmount: confirmedPaid,
            debtAmount: newDebt,
            status: nextStatus,
            assignedToId: nextAssignedToId,
          },
        });

        // Создаем автоматическую запись в истории наряда
        await prisma.orderComment.create({
          data: {
            orderId: order.id,
            authorName: "Тимур (Директор)",
            text: `💵 Оплата подтверждена в кассу. Наряд автоматически направлен в цех (${nextStatus === "PRINTING" ? "Альберту в печать 🖨️" : "Абзалу на сборку 🛠️"}).`,
          },
        }).catch((e) => console.error("Auto comment error:", e));
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
