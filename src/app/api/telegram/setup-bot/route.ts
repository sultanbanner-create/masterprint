import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://masterprint-sultanbanner-9247s-projects.vercel.app";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let token = body.token;

    const DEFAULT_BOT_TOKEN = "8999743919:AAF-aDlEkG32xSaG823aSYbUcBfLIpOTDnU";
    if (!token) {
      const setting = await prisma.telegramSetting.findUnique({
        where: { id: "default" },
      });
      token = setting?.botToken || DEFAULT_BOT_TOKEN;
    }

    // 1. Проверяем бота через getMe
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();
    if (!meRes.ok || !meData.ok) {
      return NextResponse.json(
        { error: `Неверный токен бота Telegram: ${meData.description || "Ошибка авторизации"}` },
        { status: 400 }
      );
    }

    const botUser = meData.result;
    const webhookUrl = `${BASE_URL}/api/telegram/webhook`;
    const webAppUrl = `${BASE_URL}/tma`;

    // 2. Устанавливаем Webhook
    const hookRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "edited_message", "callback_query"],
      }),
    });
    const hookData = await hookRes.json();

    // 3. Устанавливаем кнопку Меню WebApp в строке ввода бота
    const menuRes = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_button: {
          type: "web_app",
          text: "Master Print ERP",
          web_app: { url: webAppUrl },
        },
      }),
    });
    const menuData = await menuRes.json();

    // 4. Регистрируем команды бота
    const cmdRes = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "start", description: "🚀 Запустить приложение Master Print" },
          { command: "orders", description: "📋 Активные наряды цеха" },
          { command: "new", description: "➕ Оформить наряд в производство" },
          { command: "calc", description: "🖩 Калькулятор стоимости наружки" },
          { command: "stats", description: "📊 Сводка смены и кассы" },
          { command: "help", description: "ℹ️ Помощь и справка" },
        ],
      }),
    });
    const cmdData = await cmdRes.json();

    // 5. Сохраняем токен в БД, если он еще не сохранен
    await prisma.telegramSetting.upsert({
      where: { id: "default" },
      update: { botToken: token },
      create: { id: "default", botToken: token },
    });

    return NextResponse.json({
      success: true,
      bot: {
        id: botUser.id,
        name: botUser.first_name,
        username: botUser.username,
        link: `https://t.me/${botUser.username}`,
        appLink: `https://t.me/${botUser.username}/app`,
      },
      webhook: {
        url: webhookUrl,
        setSuccess: hookData.ok,
      },
      menuButton: {
        url: webAppUrl,
        setSuccess: menuData.ok,
      },
      commands: {
        setSuccess: cmdData.ok,
      },
    });
  } catch (error: any) {
    console.error("[Setup Bot Error]:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка настройки Telegram-бота" },
      { status: 500 }
    );
  }
}
