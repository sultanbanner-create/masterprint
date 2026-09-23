import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { STATUS_CONFIG } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const now = new Date();

    // Заказы, которые НЕ готовы и НЕ завершены
    const orders = await prisma.order.findMany({
      where: {
        status: {
          notIn: ["READY", "COMPLETED"],
        },
        deadline: {
          not: null,
        },
      },
      include: {
        client: true,
        assignedTo: true,
        items: true,
      },
      orderBy: { deadline: "asc" },
    });

    const burningOrders = orders
      .map((o) => {
        const d = new Date(o.deadline!);
        const diffMs = d.getTime() - now.getTime();
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));
        const diffMinutesTotal = Math.round(diffMs / (1000 * 60));
        const isOverdue = diffMs < 0;
        const isUrgent = o.priority === "URGENT" || diffHours <= 24;

        let timeText = "";
        if (isOverdue) {
          const absMin = Math.abs(diffMinutesTotal);
          const h = Math.floor(absMin / 60);
          const m = absMin % 60;
          timeText = h > 0 ? `Просрочен на ${h} ч ${m} мин 🔥` : `Просрочен на ${m} мин 🔥`;
        } else {
          const h = Math.floor(diffMinutesTotal / 60);
          const m = diffMinutesTotal % 60;
          timeText = h > 0 ? `Осталось ${h} ч ${m} мин` : `Осталось ${m} мин 🔥`;
        }

        const statusInfo = STATUS_CONFIG[o.status] || { label: o.status };

        return {
          id: o.id,
          orderNumber: o.orderNumber,
          title: o.title,
          status: o.status,
          statusLabel: statusInfo.label,
          priority: o.priority,
          deadline: o.deadline,
          diffHours,
          diffMinutesTotal,
          isOverdue,
          isUrgent,
          timeText,
          assignedTo: o.assignedTo
            ? {
                id: o.assignedTo.id,
                name: o.assignedTo.name,
                roleTitle: o.assignedTo.roleTitle,
              }
            : null,
          client: o.client
            ? {
                id: o.client.id,
                name: o.client.name,
                phone: o.client.phone,
                company: o.client.company,
              }
            : null,
          totalAmount: o.totalAmount,
        };
      })
      .filter((o) => o.diffHours <= 24 || o.isOverdue || o.priority === "URGENT");

    return NextResponse.json({
      count: burningOrders.length,
      criticalCount: burningOrders.filter((o) => o.isOverdue || o.diffHours <= 6).length,
      burningOrders,
    });
  } catch (error: any) {
    console.error("Error fetching burning deadlines:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch deadlines" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { orderId } = body;

    const tgSetting = await prisma.telegramSetting.findUnique({
      where: { id: "default" },
    });

    if (!tgSetting || !tgSetting.botToken || !tgSetting.chatId) {
      return NextResponse.json(
        { error: "Telegram бот не настроен в системе (/settings/telegram)" },
        { status: 400 }
      );
    }

    const now = new Date();
    const whereClause: any = {
      status: { notIn: ["READY", "COMPLETED"] },
      deadline: { not: null },
    };
    if (orderId) {
      whereClause.id = Number(orderId);
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: { assignedTo: true, client: true },
      orderBy: { deadline: "asc" },
    });

    const burning = orders.filter((o) => {
      const diffHours = (new Date(o.deadline!).getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffHours <= 24 || o.priority === "URGENT";
    });

    if (burning.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "Нет горящих заказов для отправки",
      });
    }

    let sentCount = 0;
    for (const order of burning) {
      const d = new Date(order.deadline!);
      const diffMin = Math.round((d.getTime() - now.getTime()) / (1000 * 60));
      const isOverdue = diffMin < 0;
      const timeRemaining = isOverdue
        ? `⚠️ ПРОСРОЧЕН на ${Math.floor(Math.abs(diffMin) / 60)} ч ${Math.abs(diffMin) % 60} мин!`
        : `⏳ Осталось: ${Math.floor(diffMin / 60)} ч ${diffMin % 60} мин!`;

      const statusLabel = STATUS_CONFIG[order.status]?.label || order.status;
      const masterName = order.assignedTo ? `${order.assignedTo.name} (${order.assignedTo.roleTitle})` : "НЕ НАЗНАЧЕН";

      const msg =
        `🔥 <b>ВНИМАНИЕ! ГОРИТ ДЕДЛАЙН ЗАКАЗА!</b>\n\n` +
        `📋 <b>Наряд:</b> #${order.orderNumber}\n` +
        `🏷 <b>Изделие:</b> ${order.title}\n` +
        `👷 <b>Ответственный мастер:</b> ${masterName}\n` +
        `⏰ <b>Срок исполнения:</b> ${d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}\n` +
        `🚨 <b>Статус дедлайна:</b> <b>${timeRemaining}</b>\n` +
        `⚡ <b>Текущий этап:</b> ${statusLabel} (<b>НЕ ГОТОВ!</b>)\n` +
        `👤 <b>Заказчик:</b> ${order.client?.name || "—"} (${order.client?.phone || "—"})\n\n` +
        `👉 <i>Срочно завершите работу или скорректируйте срок в Master Print ERP!</i>`;

      try {
        const tgRes = await fetch(
          `https://api.telegram.org/bot${tgSetting.botToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: tgSetting.chatId,
              text: msg,
              parse_mode: "HTML",
            }),
          }
        );
        if (tgRes.ok) sentCount++;
      } catch (err) {
        console.error("Failed to send TG deadline alert for order", order.id, err);
      }
    }

    return NextResponse.json({ success: true, sent: sentCount });
  } catch (error: any) {
    console.error("Failed to dispatch deadline notifications:", error);
    return NextResponse.json(
      { error: error.message || "Failed to dispatch" },
      { status: 500 }
    );
  }
}
