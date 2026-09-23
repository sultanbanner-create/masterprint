import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_BOT_TOKEN = "8999743919:AAF-aDlEkG32xSaG823aSYbUcBfLIpOTDnU";

export async function GET() {
  try {
    let setting = await prisma.telegramSetting.findUnique({
      where: { id: "default" },
    });

    if (!setting) {
      setting = await prisma.telegramSetting.create({
        data: {
          id: "default",
          botToken: DEFAULT_BOT_TOKEN,
          chatId: "",
          notifyNewOrder: true,
          notifyDeadline: true,
          notifyStatus: true,
        },
      });
    } else if (!setting.botToken) {
      setting.botToken = DEFAULT_BOT_TOKEN;
    }

    return NextResponse.json(setting);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { botToken, chatId, notifyNewOrder, notifyDeadline, notifyStatus } = body;

    const updated = await prisma.telegramSetting.upsert({
      where: { id: "default" },
      update: {
        botToken,
        chatId,
        notifyNewOrder: !!notifyNewOrder,
        notifyDeadline: !!notifyDeadline,
        notifyStatus: !!notifyStatus,
      },
      create: {
        id: "default",
        botToken,
        chatId,
        notifyNewOrder: !!notifyNewOrder,
        notifyDeadline: !!notifyDeadline,
        notifyStatus: !!notifyStatus,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
