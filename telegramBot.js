const https = require('https');
const store = require('./data/store');
const { broadcastEvent } = require('./routes/events');

const BOT_TOKEN = '8902389261:AAHKHTgEmrYOW7n6FMliucJ4928OkdjfOMg';
const API_URL = 'https://api.telegram.org/bot' + BOT_TOKEN;

// In-memory wizard sessions: chatId -> { step, orderData }
const userSessions = new Map();

// Helper to make Telegram API requests
function callApi(method, payload = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const url = new URL(`${API_URL}/${method}`);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ ok: false, error: body });
        }
      });
    });

    req.on('error', (err) => {
      console.error(`Telegram API error (${method}):`, err.message);
      resolve({ ok: false, error: err.message });
    });

    req.write(data);
    req.end();
  });
}

// Send Text Message Helper
async function sendMessage(chatId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return await callApi('sendMessage', payload);
}

// Main Menu Keyboard
const MAIN_MENU = {
  keyboard: [
    [{ text: '📦 Новый заказ' }, { text: '🔍 Статус заказа' }],
    [{ text: '📋 Мои заказы' }, { text: '💰 Прайс-лист услуг' }],
    [{ text: '📞 Контакты цеха' }, { text: 'ℹ️ О полиграфии' }]
  ],
  resize_keyboard: true
};

// Handle Incoming Updates
async function handleUpdate(update) {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }

  const message = update.message;
  if (!message || !message.chat) return;

  const chatId = message.chat.id;
  const text = (message.text || '').trim();
  const session = userSessions.get(chatId) || { step: 'idle', data: {} };

  // Global cancel
  if (text === '❌ Отмена' || text === '/cancel') {
    userSessions.delete(chatId);
    await sendMessage(chatId, 'Действие отменено. Выберите пункт меню:', MAIN_MENU);
    return;
  }

  // Commands
  if (text === '/start') {
    userSessions.delete(chatId);
    const welcome = `👋 <b>Добро пожаловать в MASTER PRINT (Цех)!</b> 🖨️✨\n\n` +
      `Я официальный бот оперативной полиграфии и наружной рекламы.\n` +
      `Здесь вы можете <b>оформить заказ онлайн</b>, отправить макет или фото на печать, узнать статус готового заказа и посмотреть цены.\n\n` +
      `Выберите нужное действие в меню ниже: 👇`;
    await sendMessage(chatId, welcome, MAIN_MENU);
    return;
  }

  if (text === '💰 Прайс-лист услуг' || text === '/prices') {
    await sendPriceList(chatId);
    return;
  }

  if (text === '📞 Контакты цеха' || text === '/contacts') {
    const contacts = `📍 <b>Полиграфия & Наружная Реклама MASTER PRINT</b>\n\n` +
      `🏢 <b>Адрес:</b> г. Нукус, ул. Каракалпакстан 45\n` +
      `⏰ <b>Режим работы:</b> Пн–Сб: 08:30 — 19:30, Вс: 09:00 — 17:00\n` +
      `📞 <b>Телефон кассы и цеха:</b> +998 90 123 45 67\n` +
      `💳 <b>Оплата:</b> Наличные, Click, Payme, Перечисление (с договором)`;
    await sendMessage(chatId, contacts, MAIN_MENU);
    return;
  }

  if (text === 'ℹ️ О полиграфии') {
    const about = `🌟 <b>MASTER PRINT — Всё для вашей рекламы и печати:</b>\n\n` +
      `• Широкоформатная печать (Баннеры 330г/440г, Сетка, Оракал, Плёнка)\n` +
      `• Оперативная полиграфия (Ксерокопия А4/А3, Ламинация, Переплёт, Визитки)\n` +
      `• Фото на документы и фотопечать до А3 (в рамке и без)\n` +
      `• Вывески, стенды, световые короба и монтаж наружной рекламы.`;
    await sendMessage(chatId, about, MAIN_MENU);
    return;
  }

  if (text === '🔍 Статус заказа') {
    userSessions.set(chatId, { step: 'awaiting_order_id', data: {} });
    const prompt = `🔍 Введите <b>номер вашего заказа</b> (например, <code>1024</code>):\n\n` +
      `<i>Номер заказа указан в товарном чеке или в сообщении от бота.</i>`;
    await sendMessage(chatId, prompt, {
      keyboard: [[{ text: '❌ Отмена' }]],
      resize_keyboard: true
    });
    return;
  }

  if (text === '📋 Мои заказы') {
    await sendClientOrders(chatId, message.from);
    return;
  }

  // WIZARD: Новый заказ
  if (text === '📦 Новый заказ') {
    userSessions.set(chatId, {
      step: 'choose_category',
      data: {
        chatId,
        telegramUser: message.from.username ? ('@' + message.from.username) : message.from.first_name,
        clientName: [message.from.first_name, message.from.last_name].filter(Boolean).join(' ') || 'Клиент Telegram'
      }
    });

    const categoryKeyboard = {
      inline_keyboard: [
        [
          { text: '🖨️ Баннеры & Наружка', callback_data: 'cat_wide_format' },
          { text: '📑 Полиграфия & Визитки', callback_data: 'cat_polygraphy' }
        ],
        [
          { text: '🖼️ Фотопечать & Рамки', callback_data: 'cat_photo' },
          { text: '🎨 Экспресс-Дизайн', callback_data: 'cat_design' }
        ]
      ]
    };

    await sendMessage(chatId, '📦 <b>Шаг 1 из 3:</b> Выберите категорию заказа:', categoryKeyboard);
    return;
  }

  // Awaiting order ID for status check
  if (session.step === 'awaiting_order_id') {
    userSessions.delete(chatId);
    await checkOrderStatus(chatId, text);
    return;
  }

  // Awaiting order description
  if (session.step === 'awaiting_description') {
    session.data.description = text;

    // Check if photo was sent
    if (message.photo && message.photo.length > 0) {
      const fileId = message.photo[message.photo.length - 1].file_id;
      session.data.fileId = fileId;
      session.data.hasPhoto = true;
      if (message.caption) session.data.description = message.caption;
    }

    session.step = 'awaiting_phone';
    userSessions.set(chatId, session);

    const contactKeyboard = {
      keyboard: [
        [{ text: '📱 Отправить мой номер телефона', request_contact: true }],
        [{ text: '❌ Отмена' }]
      ],
      resize_keyboard: true
    };

    await sendMessage(chatId, '📱 <b>Шаг 3 из 3:</b> Укажите ваш контактный номер телефона (нажмите кнопку ниже или напишите текстом):', contactKeyboard);
    return;
  }

  // Awaiting phone
  if (session.step === 'awaiting_phone') {
    let phone = text;
    if (message.contact && message.contact.phone_number) {
      phone = message.contact.phone_number;
    }

    if (!phone || phone.length < 7) {
      await sendMessage(chatId, '⚠️ Пожалуйста, введите корректный номер телефона (например: +998901234567):');
      return;
    }

    session.data.phone = phone;

    // CREATE ORDER IN ERP
    await finalizeTelegramOrder(chatId, session.data, message.from);
    userSessions.delete(chatId);
    return;
  }

  // Default fallback
  await sendMessage(chatId, 'Не понял команду. Выберите действие в меню:', MAIN_MENU);
}

// Handle Callback Queries (Inline buttons)
async function handleCallbackQuery(cb) {
  const chatId = cb.message.chat.id;
  const data = cb.data;
  const session = userSessions.get(chatId);

  await callApi('answerCallbackQuery', { callback_query_id: cb.id });

  if (session && session.step === 'choose_category') {
    const catMap = {
      cat_wide_format: { id: 'wide_format', name: 'Широкоформатная печать (Баннер / Оракал)' },
      cat_polygraphy: { id: 'polygraphy', name: 'Полиграфия (Ксерокопия / Визитки / Ламинация)' },
      cat_photo: { id: 'photo', name: 'Фотопечать & Рамки' },
      cat_design: { id: 'design', name: 'Экспресс-Дизайн' }
    };

    const chosen = catMap[data] || { id: 'polygraphy', name: 'Полиграфия' };
    session.data.category = chosen.id;
    session.data.categoryName = chosen.name;
    session.step = 'awaiting_description';
    userSessions.set(chatId, session);

    const prompt = `✅ Выбрано: <b>${chosen.name}</b>\n\n` +
      `📝 <b>Шаг 2 из 3:</b> Напишите подробности вашего заказа:\n` +
      `<i>(Например: "Баннер 3х2м, 440г с люверсами через каждые 30см" или "Распечатка 50 страниц А4 цветная".)</i>\n\n` +
      `Вы также можете прикрепить фото или эскиз макета прямо в сообщение!`;

    await sendMessage(chatId, prompt, {
      keyboard: [[{ text: '❌ Отмена' }]],
      resize_keyboard: true
    });
  }
}

// Finalize and Save Order to ERP Database
async function finalizeTelegramOrder(chatId, orderData, tgUser) {
  try {
    const orders = store.db.orders || [];
    let maxNum = 1000;
    orders.forEach(o => {
      const n = parseInt(o.orderNumber);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    });
    const orderNumber = String(maxNum + 1);

    const now = new Date();
    const newOrder = {
      id: 'ord_' + Date.now(),
      orderNumber,
      category: orderData.category || 'wide_format',
      title: orderData.description || (orderData.categoryName || 'Заказ из Telegram'),
      clientName: orderData.clientName || tgUser.first_name || 'Клиент Telegram',
      clientPhone: orderData.phone || '',
      details: {
        source: 'telegram_bot',
        telegramChatId: chatId,
        telegramUsername: orderData.telegramUser || '',
        categoryName: orderData.categoryName
      },
      designerId: 'islam',
      designerFee: 0,
      masterId: 'makhmud',
      masterFee: 0,
      totalAmount: 0, // Will be assessed by designer in ERP
      paidAmount: 0,
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      paymentConfirmedBy: null,
      paymentConfirmedAt: null,
      status: 'new',
      notes: `Заказ оформлен через Telegram-бота @Zakazkarmp_bot (ChatID: ${chatId})`,
      createdBy: 'Telegram-бот',
      createdAt: now.toISOString(),
      history: [{ status: 'new', time: now.toISOString(), user: 'Telegram-бот' }]
    };

    if (!store.db.orders) store.db.orders = [];
    store.db.orders.unshift(newOrder);
    store.save();

    // Broadcast in real-time to Cashier & ERP
    broadcastEvent('order_created', newOrder);

    const confirmation = `🎉 <b>ВАШ ЗАКАЗ УСПЕШНО ПРИНЯТ В ЦЕХ!</b>\n\n` +
      `📌 <b>Номер заказа:</b> <code>#${orderNumber}</code>\n` +
      `📦 <b>Категория:</b> ${orderData.categoryName}\n` +
      `📝 <b>Описание:</b> ${orderData.description}\n` +
      `📞 <b>Телефон:</b> ${orderData.phone}\n\n` +
      `🟡 <b>Статус:</b> <i>Принят в работу</i>\n\n` +
      `⚡ Заказ уже передан на кассу и на экран мастерам цеха MASTER PRINT.\n` +
      `Как только дизайнер рассчитает стоимость или заказ будет напечатан — вам придёт автоматическое оповещение прямо сюда! 🔔`;

    await sendMessage(chatId, confirmation, MAIN_MENU);
  } catch (err) {
    console.error('Error creating order from telegram:', err);
    await sendMessage(chatId, '⚠️ Произошла ошибка при сохранении заказа. Попробуйте еще раз или позвоните нам.', MAIN_MENU);
  }
}

// Check Order Status
async function checkOrderStatus(chatId, rawNum) {
  const num = rawNum.replace(/\D/g, '');
  const orders = store.db.orders || [];
  const order = orders.find(o => String(o.orderNumber) === num);

  if (!order) {
    await sendMessage(chatId, `❌ Заказ с номером <b>#${rawNum}</b> не найден в системе MASTER PRINT.\nПроверьте номер чека и попробуйте снова.`, MAIN_MENU);
    return;
  }

  const statusMap = {
    new: '🟡 Новый — заказ принят, ожидает очереди печати',
    in_progress: '🔵 В работе — заказ печатается в цехе',
    ready: '🟢 ГОТОВ К ВЫДАЧЕ! Можете забирать в MASTER PRINT',
    delivered: '🏁 Выдан клиенту',
    'Долг (Карыз)': '⚠️ Ожидает расчёта / Долг'
  };

  const statusText = statusMap[order.status] || order.status;
  const isPaid = (Number(order.paidAmount) || 0) >= (Number(order.totalAmount) || 0) && (Number(order.totalAmount) || 0) > 0;

  const msg = `📋 <b>Информация по заказу #${order.orderNumber}:</b>\n\n` +
    `📦 <b>Наименование:</b> ${order.title}\n` +
    `👤 <b>Клиент:</b> ${order.clientName}\n` +
    `🔄 <b>Текущий статус:</b>\n👉 <b>${statusText}</b>\n\n` +
    `💰 <b>Сумма:</b> ${order.totalAmount ? (Number(order.totalAmount).toLocaleString('ru-RU') + ' сум') : 'Рассчитывается мастером'}\n` +
    `💳 <b>Оплата:</b> ${isPaid ? '✅ Оплачено 100%' : ((Number(order.paidAmount) > 0) ? `Частично (${Number(order.paidAmount).toLocaleString('ru-RU')} сум)` : '⏳ Ожидает оплаты')}\n\n` +
    `🏢 <i>Пункт выдачи: MASTER PRINT (г. Нукус, ул. Каракалпакстан 45)</i>`;

  await sendMessage(chatId, msg, MAIN_MENU);
}

// Send Client Orders List
async function sendClientOrders(chatId, tgUser) {
  const orders = store.db.orders || [];
  const myOrders = orders.filter(o => {
    if (o.details && String(o.details.telegramChatId) === String(chatId)) return true;
    return false;
  }).slice(0, 5);

  if (myOrders.length === 0) {
    await sendMessage(chatId, 'У вас пока нет оформленных заказов через Telegram-бота. Нажмите <b>«📦 Новый заказ»</b> чтобы оформить заказ за 1 минуту!', MAIN_MENU);
    return;
  }

  let text = `📋 <b>Ваши последние заказы в MASTER PRINT:</b>\n\n`;
  myOrders.forEach(o => {
    const statusIcons = { new: '🟡', in_progress: '🔵', ready: '🟢', delivered: '🏁' };
    text += `• <b>#${o.orderNumber}</b> — ${o.title}\n` +
      `  Статус: ${statusIcons[o.status] || '⚪'} <b>${o.status}</b> | Сумма: ${(Number(o.totalAmount) || 0).toLocaleString('ru-RU')} сум\n\n`;
  });

  await sendMessage(chatId, text, MAIN_MENU);
}

// Send Price List
async function sendPriceList(chatId) {
  const services = store.db.quickServices || [];
  let text = `💰 <b>Прейскурант услуг MASTER PRINT:</b>\n\n`;

  services.slice(0, 10).forEach(s => {
    text += `• <b>${s.title}</b> — <code>${(Number(s.price) || 0).toLocaleString('ru-RU')} сум / ${s.unit || 'шт'}</code>\n`;
  });

  text += `\n📞 <i>Точный расчёт нестандартных размеров баннеров и вывесок — у нашего менеджера.</i>`;
  await sendMessage(chatId, text, MAIN_MENU);
}

// =========================================================================
// REAL-TIME SYNCHRONIZATION FROM ERP TO TELEGRAM
// =========================================================================

// Notify customer when order status changes in ERP
async function notifyOrderStatus(order) {
  if (!order || !order.details || !order.details.telegramChatId) return;
  const chatId = order.details.telegramChatId;

  let text = '';
  if (order.status === 'ready') {
    text = `🎉 <b>ОТЛИЧНАЯ НОВОСТЬ!</b>\n\n` +
      `🟢 Ваш заказ <b>#${order.orderNumber}</b> («${order.title}») <b>ГОТОВ К ВЫДАЧЕ!</b>\n\n` +
      `📍 Можете забрать его в полиграфии <b>MASTER PRINT</b>:\n` +
      `г. Нукус, ул. Каракалпакстан 45\n` +
      `Сумма к оплате: <b>${(Number(order.totalAmount) || 0).toLocaleString('ru-RU')} сум</b>\n\n` +
      `Ждём вас! 😊`;
  } else if (order.status === 'in_progress') {
    text = `🔵 <b>Ваш заказ #${order.orderNumber} передан в печать!</b>\n` +
      `Мастера цеха MASTER PRINT приступили к изготовлению.`;
  } else if (order.status === 'delivered') {
    text = `🏁 <b>Заказ #${order.orderNumber} выдан!</b>\n` +
      `Спасибо, что выбрали MASTER PRINT! Будем рады видеть вас снова. ✨`;
  }

  if (text) {
    await sendMessage(chatId, text);
  }
}

// Notify customer when payment is confirmed in ERP
async function notifyPaymentReceived(order, cashierName) {
  if (!order || !order.details || !order.details.telegramChatId) return;
  const chatId = order.details.telegramChatId;

  const text = `🧾 <b>ЭЛЕКТРОННЫЙ ЧЕК ОПЛАТЫ</b>\n\n` +
    `✅ Оплата по заказу <b>#${order.orderNumber}</b> успешно подтверждена!\n` +
    `💰 Сумма: <b>${(Number(order.paidAmount) || Number(order.totalAmount) || 0).toLocaleString('ru-RU')} сум</b>\n` +
    `💳 Способ: ${order.paymentMethod === 'click' ? '📱 Click / Payme' : '💵 Наличные'}\n` +
    `👩‍💼 Кассир: ${cashierName || 'Наргиза (Кассир)'}\n` +
    `📅 Дата: ${new Date().toLocaleString('ru-RU')}\n\n` +
    `<i>MASTER PRINT — Качество и скорость печати</i>`;

  await sendMessage(chatId, text);
}

// Long Polling Loop
let lastUpdateId = 0;
let isPolling = false;

async function startPolling() {
  if (isPolling) return;
  isPolling = true;
  console.log('🤖 Telegram Bot @Zakazkarmp_bot started and listening for orders...');

  while (isPolling) {
    try {
      const res = await callApi('getUpdates', {
        offset: lastUpdateId + 1,
        timeout: 20
      });

      if (res && res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          lastUpdateId = update.update_id;
          await handleUpdate(update);
        }
      }
    } catch (err) {
      console.error('Telegram polling error:', err.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

function stopPolling() {
  isPolling = false;
}

module.exports = {
  startPolling,
  stopPolling,
  notifyOrderStatus,
  notifyPaymentReceived,
  sendMessage
};
