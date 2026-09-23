import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://masterprint-erp.vercel.app";

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    // 1. Получаем настройки бота из БД
    const setting = await prisma.telegramSetting.findUnique({
      where: { id: "default" },
    });

    const botToken = setting?.botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.warn("[TG Webhook] Bot token not configured");
      return NextResponse.json({ ok: true, message: "Bot token not configured" });
    }

    const message = update.message || update.edited_message;
    if (!message || !message.chat) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = (message.text || "").trim();
    const senderName = message.from?.first_name || "Коллега";

    const sendTg = async (endpoint: string, payload: any) => {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        console.error(`[TG API Error] ${endpoint}:`, e);
      }
    };

    // КОМАНДА: /start
    if (text.startsWith("/start")) {
      const welcomeText = 
        `👋 <b>Здравствуйте, ${senderName}!</b>\n\n` +
        `🏭 <b>Добро пожаловать в Telegram-приложение MASTER PRINT!</b>\n` +
        `Система оперативного управления заказами, калькулятором ТЗ и конвейером цеха наружной рекламы.\n\n` +
        `📱 <b>Нажмите кнопку ниже, чтобы открыть приложение прямо в Telegram:</b>`;

      await sendTg("sendMessage", {
        chat_id: chatId,
        text: welcomeText,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🚀 Открыть Master Print ERP",
                web_app: { url: `${BASE_URL}/tma` },
              },
            ],
            [
              {
                text: "📦 Оформить наряд",
                web_app: { url: `${BASE_URL}/tma?tab=new` },
              },
              {
                text: "🖩 Калькулятор ТЗ",
                web_app: { url: `${BASE_URL}/tma?tab=calc` },
              },
            ],
            [
              {
                text: "📋 Список заказов (/orders)",
                callback_data: "cmd_orders",
              },
              {
                text: "📊 Сводка смены (/stats)",
                callback_data: "cmd_stats",
              },
            ],
          ],
        },
      });

      // Автоматически устанавливаем кнопку Menu WebApp для чата
      await sendTg("setChatMenuButton", {
        chat_id: chatId,
        menu_button: {
          type: "web_app",
          text: "Master Print ERP",
          web_app: { url: `${BASE_URL}/tma` },
        },
      });

      return NextResponse.json({ ok: true });
    }

    // КОМАНДА: /orders или callback cmd_orders
    if (text.startsWith("/orders") || text === "📋 Заказы") {
      const activeOrders = await prisma.order.findMany({
        where: { status: { not: "COMPLETED" } },
        include: { client: true, assignedTo: true, items: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      if (activeOrders.length === 0) {
        await sendTg("sendMessage", {
          chat_id: chatId,
          text: "✨ <b>В цехе сейчас нет активных нарядов!</b>\nВсе заказы выполнены.",
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "➕ Создать новый наряд", web_app: { url: `${BASE_URL}/tma?tab=new` } }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      let ordersMsg = `📋 <b>Активные наряды цеха Master Print (${activeOrders.length}):</b>\n\n`;

      for (const o of activeOrders) {
        const statusMap: Record<string, string> = {
          NEW: "🆕 Новый",
          DESIGN: "🎨 Макет",
          PRINTING: "🖨️ Печать",
          ASSEMBLY: "🛠️ Сборка",
          MOUNTING: "🚚 Монтаж",
          READY: "✅ Готов",
        };
        const statusLabel = statusMap[o.status] || o.status;
        const master = o.assignedTo?.name || "Не назначен";
        const urgent = o.priority === "URGENT" ? "🔥 СРОЧНО! " : "";

        ordersMsg += 
          `<b>${o.orderNumber}</b> • ${statusLabel} ${urgent}\n` +
          `🏷 <i>${o.title}</i>\n` +
          `👤 Заказчик: ${o.client.name} • 👷 Мастер: <b>${master}</b>\n` +
          `💰 Сумма: ${o.totalAmount.toLocaleString()} сум\n` +
          `────────────────────\n`;
      }

      await sendTg("sendMessage", {
        chat_id: chatId,
        text: ordersMsg,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Открыть весь список в приложении", web_app: { url: `${BASE_URL}/tma` } }],
          ],
        },
      });

      return NextResponse.json({ ok: true });
    }

    // КОМАНДА: /stats
    if (text.startsWith("/stats") || text === "📊 Сводка") {
      const [orders, employees] = await Promise.all([
        prisma.order.findMany({
          include: { items: true, assignedTo: true },
        }),
        prisma.employee.findMany(),
      ]);

      const active = orders.filter((o) => o.status !== "COMPLETED");
      const totalRev = orders.reduce((s, o) => s + o.paidAmount, 0);
      const totalDebt = orders.reduce((s, o) => s + o.debtAmount, 0);

      // Печать для Альберта
      const printM2 = orders
        .filter((o) => o.status !== "COMPLETED")
        .reduce((sum, o) => {
          return (
            sum +
            o.items
              .filter((i) => i.serviceType === "BANNER" || i.serviceType === "ORACAL")
              .reduce((s, i) => s + (i.area || 0), 0)
          );
        }, 0);

      // Буквы для Абзала
      const lettersCount = orders
        .filter((o) => o.status !== "COMPLETED")
        .reduce((sum, o) => {
          return (
            sum +
            o.items
              .filter((i) => i.serviceType === "LETTERS")
              .reduce((s, i) => s + (i.letterCount || 0), 0)
          );
        }, 0);

      const statsMsg = 
        `📊 <b>Производственная сводка Master Print:</b>\n\n` +
        `⚡ <b>Заказов в работе:</b> ${active.length} шт.\n` +
        `💵 <b>Касса (оплачено):</b> ${totalRev.toLocaleString()} сум\n` +
        `⏳ <b>Дебиторка (долги):</b> ${totalDebt.toLocaleString()} сум\n\n` +
        `<b>Загрузка мастеров на сегодня:</b>\n` +
        `🖨️ <b>Альберт (Печать):</b> ${printM2.toFixed(1)} м² в очереди\n` +
        `💡 <b>Абзал (Сборка букв):</b> ${lettersCount} шт. в очереди\n`;

      await sendTg("sendMessage", {
        chat_id: chatId,
        text: statsMsg,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📱 Открыть дашборд", web_app: { url: `${BASE_URL}/tma` } }],
          ],
        },
      });

      return NextResponse.json({ ok: true });
    }

    // КОМАНДА: /calc
    if (text.startsWith("/calc")) {
      await sendTg("sendMessage", {
        chat_id: chatId,
        text: "🖩 <b>Калькулятор ТЗ Master Print</b>\n\nРассчитайте стоимость баннеров, коробов из акрила, световых букв и пленки:",
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🖩 Открыть калькулятор ТЗ", web_app: { url: `${BASE_URL}/tma?tab=calc` } }],
          ],
        },
      });
      return NextResponse.json({ ok: true });
    }

    // КОМАНДА: /new
    if (text.startsWith("/new")) {
      await sendTg("sendMessage", {
        chat_id: chatId,
        text: "📦 <b>Оформление нового наряда в цех:</b>\n\nЗаполните параметры изделия и назначьте мастера:",
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "➕ Оформить наряд", web_app: { url: `${BASE_URL}/tma?tab=new` } }],
          ],
        },
      });
      return NextResponse.json({ ok: true });
    }

    // КОМАНДА: /help
    await sendTg("sendMessage", {
      chat_id: chatId,
      text: 
        `ℹ️ <b>Команды Telegram-бота Master Print:</b>\n\n` +
        `/start — Главное меню и запуск приложения\n` +
        `/orders — Список активных нарядов цеха\n` +
        `/new — Оформить наряд в производство\n` +
        `/calc — Калькулятор стоимости наружки\n` +
        `/stats — Сводка кассы и загрузки мастеров\n\n` +
        `💡 <i>Нажмите кнопку «Master Print ERP» в левом нижнем углу строки ввода, чтобы запустить приложение в любой момент!</i>`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🚀 Запустить приложение", web_app: { url: `${BASE_URL}/tma` } }],
        ],
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[TG Webhook Error]:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
