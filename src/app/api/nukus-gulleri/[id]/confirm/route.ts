import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateUlugbekClient } from "@/lib/nukus-boxes";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = params.id;
    const body = await req.json().catch(() => ({}));
    const clientNote = body.note || "";

    const ulugbek = await getOrCreateUlugbekClient();

    let targetOrder = null;
    if (rawId.startsWith("NG-")) {
      targetOrder = await prisma.order.findFirst({
        where: { orderNumber: rawId },
        include: { items: true },
      });
    } else {
      const numId = parseInt(rawId);
      if (!isNaN(numId)) {
        targetOrder = await prisma.order.findUnique({
          where: { id: numId },
          include: { items: true },
        });
      }
    }

    if (!targetOrder) {
      return NextResponse.json(
        { error: "Наряд не найден" },
        { status: 404 }
      );
    }

    const now = new Date();
    const confirmedByTitle = "Улугбек (Нукус гуллери)";

    // Update order status to COMPLETED and set completedBy/completedAt
    const updatedOrder = await prisma.order.update({
      where: { id: targetOrder.id },
      data: {
        status: "COMPLETED",
        completedBy: confirmedByTitle,
        completedAt: now,
        comments: {
          create: [
            {
              authorName: confirmedByTitle,
              text: `✅ ЗАКАЗЧИК ПОДТВЕРДИЛ ПРИЕМКУ: Улугбек принял партию коробок (${targetOrder.orderNumber}). Объем проверен, накладная согласована.${clientNote ? ` Примечание заказчика: ${clientNote}` : ""}`,
            },
          ],
        },
      },
      include: {
        items: true,
        client: true,
        comments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Notify workshop via Telegram if bot token and chat id are set
    try {
      const tgSetting = await prisma.telegramSetting.findUnique({
        where: { id: "default" },
      });

      if (tgSetting?.botToken && tgSetting?.chatId) {
        const totalQty = targetOrder.items.reduce((s, it) => s + it.quantity, 0);
        const msg = `🌸 <b>ПРИЕМКА ПОДТВЕРЖДЕНА!</b>\n\n` +
          `📦 <b>Накладная:</b> ${targetOrder.orderNumber}\n` +
          `👤 <b>Заказчик:</b> ${confirmedByTitle}\n` +
          `📊 <b>Объем партии:</b> ${totalQty} шт.\n` +
          `💰 <b>Сумма:</b> ${targetOrder.totalAmount.toLocaleString()} сум\n` +
          `⏰ <b>Время приемки:</b> ${now.toLocaleTimeString("ru-RU", { timeZone: "Asia/Tashkent" })} (${now.toLocaleDateString("ru-RU")})\n\n` +
          `<i>Улугбек подтвердил получение коробок через электронный акт Master Print.</i>`;

        await fetch(`https://api.telegram.org/bot${tgSetting.botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: tgSetting.chatId,
            text: msg,
            parse_mode: "HTML",
          }),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("Failed to send Telegram notification on confirmation:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Приемка партии успешно подтверждена!",
      confirmedBy: confirmedByTitle,
      confirmedAt: now,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error("Error in POST /api/nukus-gulleri/[id]/confirm:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при подтверждении приемки" },
      { status: 500 }
    );
  }
}
