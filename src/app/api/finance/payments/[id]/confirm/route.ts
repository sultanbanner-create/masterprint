import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { getOrCreateUlugbekClient } from "@/lib/nukus-boxes";

// POST: Подтверждение оплаты Администратором (Директором) -> Списание долга и зачисление в кассу
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
        { error: "Только Администратор / Руководитель (Тимур) может подтверждать оплаты в кассу" },
        { status: 403 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: { order: { include: { items: true, client: true } } },
    });

    if (!payment) {
      return NextResponse.json({ error: "Платеж не найден" }, { status: 404 });
    }

    if (payment.status === "CONFIRMED") {
      return NextResponse.json({ error: "Этот платеж уже подтвержден" }, { status: 400 });
    }

    const isNukusPayment =
      payment.notes?.includes("[NUKUS_BOXES]") ||
      payment.notes?.includes("Нукус гуллери") ||
      payment.order?.items?.some((it) => it.serviceType === "BOXES_NUKUS");

    // 1. Если это оплата по линии коробок Улугбека («Нукус гуллери»)
    if (isNukusPayment) {
      const ulugbek = await getOrCreateUlugbekClient();
      const debtorOrders = await prisma.order.findMany({
        where: {
          clientId: ulugbek.id,
          debtAmount: { gt: 0 },
        },
        orderBy: { createdAt: "asc" },
      });

      let remainingPayment = payment.amount;
      const allocations: string[] = [];

      for (const order of debtorOrders) {
        if (remainingPayment <= 0) break;

        const toPay = Math.min(order.debtAmount, remainingPayment);
        if (toPay <= 0) continue;

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

        allocations.push(`${order.id}:${toPay}`);
        remainingPayment -= toPay;
      }

      const allocTag = allocations.length > 0 ? ` [ALLOC:${allocations.join(",")}]` : "";
      const cleanNotes = (payment.notes || "Оплата за коробки («Нукус гуллери»)").replace(/\s*\[ALLOC:[^\]]*\]/g, "");

      const updatedPayment = await prisma.payment.update({
        where: { id: params.id },
        data: {
          status: "CONFIRMED",
          acceptedBy: user.name || "Тимур",
          acceptedAt: new Date(),
          notes: `${cleanNotes}${allocTag}`,
        },
      });

      return NextResponse.json({
        success: true,
        payment: updatedPayment,
        message: `✅ Оплата ${payment.amount.toLocaleString("ru-RU")} сум подтверждена! Долг Улугбека успешно списан.`,
      });
    }

    // 2. Обычный заказ
    const updatedPayment = await prisma.payment.update({
      where: { id: params.id },
      data: {
        status: "CONFIRMED",
        acceptedBy: user.name || "Тимур",
        acceptedAt: new Date(),
      },
    });

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
        } else if (newDebt === 0 && order.status === "READY") {
          nextStatus = "COMPLETED";
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

        await prisma.orderComment.create({
          data: {
            orderId: order.id,
            authorName: `${user.name || "Тимур"} (Админ)`,
            text: `💵 Оплата на сумму ${payment.amount.toLocaleString("ru-RU")} сум подтверждена в кассу. Остаток долга: ${newDebt.toLocaleString("ru-RU")} сум.`,
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

// DELETE: Отклонение ожидающей оплаты ИЛИ Отмена уже подтвержденной оплаты (с возвратом долга!)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("mp_auth_session")?.value;
    const user = token ? verifyToken(token) : null;

    if (!user || user.role !== "DIRECTOR") {
      return NextResponse.json(
        { error: "Только Администратор / Руководитель (Тимур) может отменять или отклонять оплаты" },
        { status: 403 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: { order: { include: { items: true } } },
    });

    if (!payment) {
      return NextResponse.json({ error: "Платеж не найден" }, { status: 404 });
    }

    // Сценарий А: Платеж еще НЕ был подтвержден (PENDING_CONFIRMATION) -> просто удаляем его, долг не менялся
    if (payment.status === "PENDING_CONFIRMATION") {
      await prisma.payment.delete({ where: { id: params.id } });
      return NextResponse.json({
        success: true,
        message: "Неподтвержденный платеж отклонен и удален. Долг клиента не изменился.",
      });
    }

    // Сценарий Б: Платеж УЖЕ БЫЛ подтвержден (CONFIRMED) по ошибке -> отменяем его и возвращаем сумму обратно в долг!
    const allocMatch = payment.notes?.match(/\[ALLOC:([^\]]+)\]/);
    const isNukusPayment =
      Boolean(allocMatch) ||
      payment.notes?.includes("[NUKUS_BOXES]") ||
      payment.notes?.includes("Нукус гуллери") ||
      payment.order?.items?.some((it) => it.serviceType === "BOXES_NUKUS");

    if (allocMatch && allocMatch[1]) {
      // Точный возврат по сохраненным партиям [ALLOC:orderId:amount,...]
      const pairs = allocMatch[1].split(",");
      for (const pair of pairs) {
        const [ordIdStr, amtStr] = pair.split(":");
        const ordId = parseInt(ordIdStr, 10);
        const amt = Number(amtStr);
        if (!isNaN(ordId) && amt > 0) {
          const ord = await prisma.order.findUnique({ where: { id: ordId } });
          if (ord) {
            const restoredPaid = Math.max(0, ord.paidAmount - amt);
            const restoredDebt = Math.min(ord.totalAmount, ord.debtAmount + amt);
            const restoredStatus = ord.status === "COMPLETED" && restoredDebt > 0 ? "READY" : ord.status;

            await prisma.order.update({
              where: { id: ord.id },
              data: {
                paidAmount: restoredPaid,
                debtAmount: restoredDebt,
                status: restoredStatus,
              },
            });
          }
        }
      }
    } else if (isNukusPayment) {
      // Возврат суммы по оплаченным заказам Улугбека (от новых к старым)
      const ulugbek = await getOrCreateUlugbekClient();
      const paidOrders = await prisma.order.findMany({
        where: {
          clientId: ulugbek.id,
          paidAmount: { gt: 0 },
        },
        orderBy: { createdAt: "desc" },
      });

      let remainingToRevert = payment.amount;
      for (const ord of paidOrders) {
        if (remainingToRevert <= 0) break;
        const revertAmt = Math.min(ord.paidAmount, remainingToRevert);
        if (revertAmt <= 0) continue;

        const restoredPaid = Math.max(0, ord.paidAmount - revertAmt);
        const restoredDebt = Math.min(ord.totalAmount, ord.debtAmount + revertAmt);
        const restoredStatus = ord.status === "COMPLETED" && restoredDebt > 0 ? "READY" : ord.status;

        await prisma.order.update({
          where: { id: ord.id },
          data: {
            paidAmount: restoredPaid,
            debtAmount: restoredDebt,
            status: restoredStatus,
          },
        });

        remainingToRevert -= revertAmt;
      }
    } else if (payment.orderId) {
      // Обычный заказ: пересчитываем сумму подтвержденных оплат без этого платежа
      const ord = await prisma.order.findUnique({
        where: { id: payment.orderId },
        include: { payments: true },
      });

      if (ord) {
        const remainingConfirmedPaid = ord.payments
          .filter((p) => p.status === "CONFIRMED" && p.id !== payment.id)
          .reduce((sum, p) => sum + p.amount, 0);

        const restoredDebt = Math.max(0, ord.totalAmount - remainingConfirmedPaid);
        const restoredStatus = ord.status === "COMPLETED" && restoredDebt > 0 ? "READY" : ord.status;

        await prisma.order.update({
          where: { id: ord.id },
          data: {
            paidAmount: remainingConfirmedPaid,
            debtAmount: restoredDebt,
            status: restoredStatus,
          },
        });

        await prisma.orderComment.create({
          data: {
            orderId: ord.id,
            authorName: `${user.name || "Тимур"} (Админ)`,
            text: `↩️ Ошибочная оплата на сумму ${payment.amount.toLocaleString("ru-RU")} сум отменена Администратором. Долг восстановлен (${restoredDebt.toLocaleString("ru-RU")} сум).`,
          },
        }).catch(() => {});
      }
    }

    await prisma.payment.delete({ where: { id: params.id } });

    return NextResponse.json({
      success: true,
      message: `↩️ Оплата на сумму ${payment.amount.toLocaleString("ru-RU")} сум отменена! Сумма возвращена обратно в долг клиента.`,
    });
  } catch (error: any) {
    console.error("Payment revert/delete error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при отмене оплаты" },
      { status: 500 }
    );
  }
}
