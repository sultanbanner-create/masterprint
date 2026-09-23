import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, token, chatId } = body;

    let botToken = token;
    let targetChatId = chatId;

    // Если не переданы в теле запроса, берем из базы настроек
    if (!botToken || !targetChatId) {
      const setting = await prisma.telegramSetting.findUnique({
        where: { id: "default" },
      });
      if (setting) {
        botToken = botToken || setting.botToken;
        targetChatId = targetChatId || setting.chatId;
      }
    }

    if (!botToken || !targetChatId) {
      return NextResponse.json(
        { error: "Не настроен Bot Token или Chat ID в системе" },
        { status: 400 }
      );
    }

    const textToSend = message || "🔔 Тестовое уведомление из MASTER PRINT цеха рекламы!";

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: textToSend,
          parse_mode: "HTML",
        }),
      }
    );

    const tgData = await telegramRes.json();

    if (!telegramRes.ok || !tgData.ok) {
      return NextResponse.json(
        { error: tgData.description || "Ошибка отправки в Telegram" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, result: tgData.result });
  } catch (error: any) {
    console.error("Telegram notification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send notification" },
      { status: 500 }
    );
  }
}
