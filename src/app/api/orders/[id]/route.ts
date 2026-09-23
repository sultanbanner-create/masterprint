import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        assignedTo: true,
        items: true,
        payments: { orderBy: { createdAt: "desc" } },
        comments: { orderBy: { createdAt: "asc" } },
        movements: { include: { material: true } },
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await req.json();
    const { status, priority, assignedToId, deadline, notes, installAddress } = body;

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (assignedToId !== undefined) data.assignedToId = assignedToId;
    if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null;
    if (notes !== undefined) data.notes = notes;
    if (installAddress !== undefined) data.installAddress = installAddress;

    const updated = await prisma.order.update({
      where: { id },
      data,
      include: {
        client: true,
        assignedTo: true,
        items: true,
        payments: true,
      },
    });

    if (status) {
      // При переводе в статус READY автоматически фиксируем отметку мастера в истории наряда
      if (status === "READY") {
        const masterName = updated.assignedTo?.name || "Мастер цеха";
        const roleInfo = updated.assignedTo?.roleTitle || "Цех производства";
        await prisma.orderComment.create({
          data: {
            orderId: updated.id,
            authorName: `${masterName} (${roleInfo})`,
            text: `✅ ЗАКАЗ ОТМЕЧЕН КАК ГОТОВЫЙ К ВЫДАЧЕ / МОНТАЖУ.\nПроизводство завершено в полном объеме. Тревога дедлайна снята.`,
          },
        }).catch((e) => console.error("Order ready comment error:", e));
      }

      try {
        const tgSetting = await prisma.telegramSetting.findUnique({ where: { id: "default" } });
        if (tgSetting && tgSetting.botToken && tgSetting.chatId && tgSetting.notifyStatus) {
          const STATUS_LABELS: Record<string, string> = {
            NEW: "Новый наряд",
            DESIGN: "Макет / Согласование (Жалгас)",
            PRINTING: "Широкоформатная печать (Альберт)",
            ASSEMBLY: "Сборка букв & коробов (Абзал)",
            MOUNTING: "Монтаж на объекте (Абзал)",
            READY: "Готов к выдаче/монтажу",
            COMPLETED: "Завершен & Оплачен",
          };

          const statusText = STATUS_LABELS[status] || status;
          const isReady = status === "READY";
          const masterName = updated.assignedTo?.name || "Мастер цеха";

          const msg = isReady
            ? `🎉 <b>НАРЯД ГОТОВ К ВЫДАЧЕ! [${updated.orderNumber}]</b>\n\n` +
              `🏷 <b>Изделие:</b> ${updated.title}\n` +
              `👷 <b>Выполнил мастер:</b> ${masterName}\n` +
              `⚡ <b>Статус:</b> Готов к выдаче клиенту / передаче на монтаж ✅\n` +
              `👤 <b>Заказчик:</b> ${updated.client?.name || ""} (${updated.client?.phone || ""})\n` +
              `💰 <b>Сумма наряда:</b> ${Math.round(updated.totalAmount).toLocaleString("ru-RU")} сум`
            : `🔄 <b>Статус изменен: ${updated.orderNumber}</b>\n\n` +
              `🏷 <b>Изделие:</b> ${updated.title}\n` +
              `⚡ <b>Новый этап:</b> ${statusText}\n` +
              `👤 <b>Заказчик:</b> ${updated.client?.name || ""}\n` +
              (updated.assignedTo ? `👷 <b>Ответственный:</b> ${updated.assignedTo.name}\n` : "");

          fetch(`https://api.telegram.org/bot${tgSetting.botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: tgSetting.chatId,
              text: msg,
              parse_mode: "HTML",
            }),
          }).catch((e) => console.error("Async TG status error:", e));
        }
      } catch (tgErr) {
        console.error("TG update notification error:", tgErr);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
