import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";
import { resolveBotToken } from "@/lib/telegram";

export const dynamic = "force-dynamic";

function maskToken(token: string | null): string {
  if (!token) return "";
  const [id] = token.split(":");
  return `${id}:••••••••`;
}

export async function GET() {
  try {
    const me = verifyToken(cookies().get(SESSION_COOKIE)?.value);
    const setting = await prisma.telegramSetting.findUnique({ where: { id: "default" } });
    const token = resolveBotToken(setting?.botToken);

    return NextResponse.json({
      id: "default",
      // Полный токен видит только директор
      botToken: me?.role === "DIRECTOR" ? token || "" : maskToken(token),
      chatId: setting?.chatId || "",
      notifyNewOrder: setting?.notifyNewOrder ?? true,
      notifyDeadline: setting?.notifyDeadline ?? true,
      notifyStatus: setting?.notifyStatus ?? true,
    });
  } catch (error) {
    return NextResponse.json({ error: "Не удалось загрузить настройки" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const me = verifyToken(cookies().get(SESSION_COOKIE)?.value);
    if (me?.role !== "DIRECTOR") {
      return NextResponse.json({ error: "Менять настройки бота может только директор" }, { status: 403 });
    }

    const body = await req.json();
    const { chatId, notifyNewOrder, notifyDeadline, notifyStatus } = body;
    const botToken = typeof body.botToken === "string" ? body.botToken.trim() : "";

    const base = {
      chatId: chatId ? String(chatId).trim() : "",
      notifyNewOrder: !!notifyNewOrder,
      notifyDeadline: !!notifyDeadline,
      notifyStatus: !!notifyStatus,
    };
    // Замаскированный токен не сохраняем поверх настоящего
    const tokenPart = botToken && !botToken.includes("•") ? { botToken } : {};

    const updated = await prisma.telegramSetting.upsert({
      where: { id: "default" },
      update: { ...base, ...tokenPart },
      create: { id: "default", ...base, ...tokenPart },
    });

    return NextResponse.json({ ...updated, botToken: updated.botToken || "" });
  } catch (error) {
    return NextResponse.json({ error: "Не удалось сохранить настройки" }, { status: 500 });
  }
}
