import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    let setting = await prisma.telegramSetting.findUnique({
      where: { id: "default" },
    });

    if (!setting) {
      setting = await prisma.telegramSetting.create({
        data: {
          id: "default",
          botToken: "",
          chatId: "",
          notifyNewOrder: true,
          notifyDeadline: true,
          notifyStatus: true,
        },
      });
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
