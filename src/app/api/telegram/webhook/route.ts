import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://masterprint-erp.vercel.app";

// Автоматическое определение категории расхода по ключевым словам
function detectExpenseCategory(text: string): { category: string; label: string; icon: string } {
  const lower = text.toLowerCase();

  const materialsKeywords = [
    "акрил", "plexiglas", "оргстекл", "фомекс", "пвх", "pvc",
    "метал", "профил", "труб", "уголок", "композит", "алюкобонд",
    "диод", "лед", "led", "модул", "блок питан", "трансформатор",
    "баннер", "оракал", "oracal", "пленк", "люверс", "неон"
  ];

  const consumablesKeywords = [
    "шуруп", "саморез", "болт", "гайк", "шайб", "дюбел", "сверл", "бур",
    "клей", "космофен", "cosmofen", "секунд", "суперклей",
    "краск", "эмал", "грунт", "баллон", "растворител", "обезжир",
    "скотч", "лент", "наждач", "круг", "диск", "лезви", "нож",
    "кист", "валик", "перчатк", "герметик", "силикон", "термоусадк"
  ];

  const transportKeywords = [
    "доставк", "такси", "yandex", "яндекс", "бензин", "солярк", "газ",
    "газел", "labo", "лабо", "перевозк", "курьер", "транспорт", "проезд"
  ];

  if (transportKeywords.some((k) => lower.includes(k))) {
    return { category: "TRANSPORT", label: "Транспорт и логистика", icon: "🚚" };
  }
  if (materialsKeywords.some((k) => lower.includes(k))) {
    return { category: "MATERIALS", label: "Материалы (акрил/фомекс/диоды)", icon: "📦" };
  }
  if (consumablesKeywords.some((k) => lower.includes(k))) {
    return { category: "CONSUMABLES", label: "Расходники (краска/шурупы/клей)", icon: "🛠️" };
  }
  return { category: "OTHER", label: "Прочие цеховые расходы", icon: "🧾" };
}

// Парсер входящей строки расхода:
// "Расход 101 45000 Шурупы и краска"
// "Расход ORD-101 45000 Шурупы"
// "Расход 45000 Шурупы"
// "/expense 101 120000 Диоды 50 шт"
function parseExpenseInput(rawText: string) {
  const stripped = rawText
    .replace(/^(\/expense|\/rashod|\/расход|расходы|расход|списание|траты)[:\s]*/i, "")
    .trim();

  if (!stripped) return null;

  // Нормализуем числа с пробелами в тысячах (например "45 000" -> "45000", "1 500 000" -> "1500000")
  let normalized = stripped;
  while (/(\d+)\s+(\d{3})\b/.test(normalized)) {
    normalized = normalized.replace(/(\d+)\s+(\d{3})\b/g, "$1$2");
  }

  const parts = normalized.split(/\s+/);
  if (parts.length < 2) return null;

  let orderIdentifier: string | null = null;
  let amount: number | null = null;
  let descStartIndex = 0;

  const parseNum = (str: string) => {
    if (!str) return null;
    const clean = str.replace(/[\s_,]/g, "").replace(/сум|uzs|руб/gi, "");
    const val = parseFloat(clean);
    return isNaN(val) ? null : val;
  };

  const isOrderFormat = (str: string) => /^#?(ORD-)?\d+$/i.test(str);

  // Вариант 1: Первый токен ORD-xxx или число, а второй токен - сумма
  if (isOrderFormat(parts[0]) && parseNum(parts[1]) !== null) {
    orderIdentifier = parts[0].replace(/#/g, "");
    amount = parseNum(parts[1]);
    descStartIndex = 2;
  } 
  // Вариант 2: Первый токен - сумма, наряда нет (общецеховой расход)
  else if (parseNum(parts[0]) !== null) {
    orderIdentifier = null;
    amount = parseNum(parts[0]);
    descStartIndex = 1;
  }

  const description = parts.slice(descStartIndex).join(" ").trim();
  if (!amount || !description) return null;

  return { orderIdentifier, amount, description };
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    // 1. Получаем настройки бота из БД
    const setting = await prisma.telegramSetting.findUnique({
      where: { id: "default" },
    });

    const DEFAULT_BOT_TOKEN = "8999743919:AAF-aDlEkG32xSaG823aSYbUcBfLIpOTDnU";
    const botToken = setting?.botToken || process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;

    const callbackQuery = update.callback_query;
    const message = update.message || update.edited_message || callbackQuery?.message;
    if (!message || !message.chat) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const callbackData = callbackQuery?.data || "";
    const text = (callbackData || message.text || message.caption || "").trim();
    const sender = callbackQuery ? callbackQuery.from : message.from;
    const senderName = sender?.first_name || "Коллега";

    const sendTg = async (endpoint: string, payload: any) => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return await res.json();
      } catch (e) {
        console.error(`[TG API Error] ${endpoint}:`, e);
        return null;
      }
    };

    // Если был callback, подтверждаем
    if (callbackQuery) {
      await sendTg("answerCallbackQuery", { callback_query_id: callbackQuery.id });
    }

    // КОМАНДА: /start
    if (text.startsWith("/start")) {
      const welcomeText = 
        `👋 <b>Здравствуйте, ${senderName}!</b>\n\n` +
        `🏭 <b>Добро пожаловать в Telegram-систему MASTER PRINT!</b>\n` +
        `Управление заказами, фиксация производственных расходов и калькулятор ТЗ цеха.\n\n` +
        `📱 <b>Выберите действие или откройте ERP приложение:</b>`;

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
                text: "📦 Наряды цеха (/orders)",
                callback_data: "cmd_orders",
              },
              {
                text: "💸 Записать расход (/expense)",
                callback_data: "cmd_expense",
              },
            ],
            [
              {
                text: "🖩 Калькулятор ТЗ",
                web_app: { url: `${BASE_URL}/tma?tab=calc` },
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

    // КОМАНДА: /expense, /rashod, "Расход", "расходы" (ПРОИЗВОДСТВЕННЫЕ РАСХОДЫ)
    const isExpenseTrigger = 
      callbackData === "cmd_expense" ||
      /^(\/expense|\/rashod|\/расход|расход|расходы|списание|траты)/i.test(text);

    if (isExpenseTrigger) {
      const parsed = parseExpenseInput(text);

      // Если введена просто команда без параметров (или нажата кнопка) — даем инструкцию
      if (!parsed) {
        const helpExpenseText =
          `💸 <b>Фиксация производственных расходов Master Print:</b>\n\n` +
          `Отправьте сообщение боту в простом формате:\n` +
          `<code>Расход [Номер заказа] [Сумма] [Описание]</code>\n\n` +
          `📌 <b>Примеры списания на заказ:</b>\n` +
          `• <code>Расход 101 45000 Шурупы и черная краска</code>\n` +
          `• <code>Расход ORD-102 180000 Диоды 50 шт и блок питания</code>\n` +
          `• <code>Расход 105 75000 Фомекс 5мм обрезки</code>\n\n` +
          `🏢 <b>Общецеховой расход (без привязки к наряду):</b>\n` +
          `• <code>Расход 35000 Скотч малярный и космофен</code>\n` +
          `• <code>Расход 25000 Доставка на Яндекс Такси</code>\n\n` +
          `📸 <b>Фото чека:</b> просто отправьте боту фото квитанции с подписью (например, <i>«Расход 101 90000 Краска»</i>) — фото чека автоматически прикрепится к наряду в ERP!`;

        await sendTg("sendMessage", {
          chat_id: chatId,
          text: helpExpenseText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📊 Посмотреть все расходы в ERP", web_app: { url: `${BASE_URL}/expenses` } }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Если параметры введены — сохраняем расход в базе
      let targetOrder: any = null;
      if (parsed.orderIdentifier) {
        const cleanId = parsed.orderIdentifier.replace(/[^0-9]/g, "");
        targetOrder = await prisma.order.findFirst({
          where: {
            OR: [
              { orderNumber: parsed.orderIdentifier },
              { orderNumber: `ORD-${cleanId}` },
              { id: parseInt(cleanId, 10) || 0 },
            ],
          },
          include: { client: true },
        });
      }

      // Определяем имя сотрудника (по сопоставлению с мастерами)
      let spenderName = sender?.first_name || "Мастер цеха";
      if (sender?.last_name) {
        spenderName += ` ${sender.last_name}`;
      }
      try {
        const employees = await prisma.employee.findMany();
        const matched = employees.find((e) =>
          spenderName.toLowerCase().includes(e.name.toLowerCase()) ||
          (sender?.username && e.name.toLowerCase().includes(sender.username.toLowerCase()))
        );
        if (matched) {
          spenderName = matched.name;
        }
      } catch (e) {
        // fallback to spenderName
      }

      // Проверяем, было ли прикреплено фото чека
      let receiptUrl: string | null = null;
      if (message.photo && Array.isArray(message.photo) && message.photo.length > 0) {
        try {
          const largestPhoto = message.photo[message.photo.length - 1];
          const fileData = await sendTg("getFile", { file_id: largestPhoto.file_id });
          if (fileData?.ok && fileData.result?.file_path) {
            receiptUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
          }
        } catch (e) {
          console.error("Failed to extract photo URL:", e);
        }
      }

      // Автоматическая категория
      const catInfo = detectExpenseCategory(parsed.description);

      // Сохраняем в БД
      const newExpense = await prisma.expense.create({
        data: {
          orderId: targetOrder?.id || null,
          title: parsed.description,
          amount: parsed.amount,
          category: catInfo.category,
          spentByName: spenderName,
          receiptUrl: receiptUrl,
        },
      });

      // Формируем красивый отчет
      const orderLabel = targetOrder 
        ? `<b>${targetOrder.orderNumber}</b> (${targetOrder.title})`
        : parsed.orderIdentifier 
          ? `<i>Общий цеховой расход (наряд #${parsed.orderIdentifier} не найден)</i>`
          : `<i>Общий цеховой расход</i>`;

      const confirmMsg =
        `✅ <b>Расход успешно зафиксирован в ERP!</b>\n\n` +
        `💰 <b>Сумма:</b> <b>${parsed.amount.toLocaleString()} сум</b>\n` +
        `📝 <b>Наименование:</b> ${parsed.description}\n` +
        `📦 <b>Наряд:</b> ${orderLabel}\n` +
        `🏷 <b>Категория:</b> ${catInfo.icon} ${catInfo.label}\n` +
        `👤 <b>Списал:</b> <b>${spenderName}</b>\n` +
        (receiptUrl ? `📸 <i>Фото чека сохранено в ERP</i>\n` : "") +
        `\n📊 <i>Баланс и себестоимость в ERP мгновенно пересчитаны!</i>`;

      const inlineButtons: any[] = [];
      if (targetOrder) {
        inlineButtons.push([
          { text: `📦 Открыть наряд ${targetOrder.orderNumber}`, web_app: { url: `${BASE_URL}/orders/${targetOrder.id}` } },
        ]);
      }
      inlineButtons.push([
        { text: "📊 Реестр расходов в ERP", web_app: { url: `${BASE_URL}/expenses` } },
      ]);

      await sendTg("sendMessage", {
        chat_id: chatId,
        text: confirmMsg,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: inlineButtons,
        },
      });

      // Оповещение в общий чат / директору, если настроено и отличается от текущего чата
      if (setting?.chatId && String(setting.chatId) !== String(chatId)) {
        await sendTg("sendMessage", {
          chat_id: setting.chatId,
          text: 
            `🔔 <b>Новый производственный расход:</b>\n` +
            `💰 <b>${parsed.amount.toLocaleString()} сум</b> • ${parsed.description}\n` +
            `📦 ${orderLabel} • 👤 ${spenderName}`,
          parse_mode: "HTML",
        });
      }

      return NextResponse.json({ ok: true });
    }

    // КОМАНДА: /orders или callback cmd_orders
    if (text.startsWith("/orders") || text === "📋 Заказы" || callbackData === "cmd_orders") {
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
            [{ text: "💸 Записать расход (/expense)", callback_data: "cmd_expense" }],
          ],
        },
      });

      return NextResponse.json({ ok: true });
    }

    // КОМАНДА: /stats или callback cmd_stats
    if (text.startsWith("/stats") || text === "📊 Сводка" || callbackData === "cmd_stats") {
      const [orders, expenses] = await Promise.all([
        prisma.order.findMany({
          include: { items: true, assignedTo: true },
        }),
        prisma.expense.findMany(),
      ]);

      const active = orders.filter((o) => o.status !== "COMPLETED");
      const totalRev = orders.reduce((s, o) => s + o.paidAmount, 0);
      const totalDebt = orders.reduce((s, o) => s + o.debtAmount, 0);
      const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

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

      // Буквы и стенды для Абзала
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

      const standsCount = orders
        .filter((o) => o.status !== "COMPLETED")
        .reduce((sum, o) => {
          return (
            sum +
            o.items
              .filter((i) => i.serviceType === "STAND" || i.serviceType === "LIGHTBOX")
              .reduce((s, i) => s + (i.quantity || 1), 0)
          );
        }, 0);

      const statsMsg = 
        `📊 <b>Производственная сводка Master Print:</b>\n\n` +
        `⚡ <b>Заказов в работе:</b> ${active.length} шт.\n` +
        `💵 <b>Касса (оплачено):</b> ${totalRev.toLocaleString()} сум\n` +
        `⏳ <b>Дебиторка (долги):</b> ${totalDebt.toLocaleString()} сум\n` +
        `💸 <b>Всего расходов:</b> ${totalExpenses.toLocaleString()} сум\n\n` +
        `<b>Загрузка мастеров на сегодня:</b>\n` +
        `🖨️ <b>Альберт (Печать):</b> ${printM2.toFixed(1)} м² в очереди\n` +
        `🛠️ <b>Абзал (Сборка & Монтаж):</b> ${lettersCount} букв, ${standsCount} стендов/коробов в очереди\n`;

      await sendTg("sendMessage", {
        chat_id: chatId,
        text: statsMsg,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📱 Открыть дашборд", web_app: { url: `${BASE_URL}/tma` } }],
            [{ text: "💸 Записать расход", callback_data: "cmd_expense" }],
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
        `/expense — Записать производственный расход (краска, шурупы, диоды и т.д.)\n` +
        `/orders — Список активных нарядов цеха\n` +
        `/new — Оформить наряд в производство\n` +
        `/calc — Калькулятор стоимости наружки\n` +
        `/stats — Сводка кассы и загрузки мастеров\n\n` +
        `💡 <i>Вы можете в любой момент написать:</i>\n` +
        `<code>Расход 101 45000 Шурупы и краска</code>\n` +
        `<i>или прислать фото чека с такой же подписью!</i>`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🚀 Запустить приложение", web_app: { url: `${BASE_URL}/tma` } }],
          [{ text: "💸 Записать расход", callback_data: "cmd_expense" }],
        ],
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[TG Webhook Error]:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
