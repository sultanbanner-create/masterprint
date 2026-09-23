import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const employeeId = searchParams.get("employeeId");
    const query = searchParams.get("query");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (employeeId && employeeId !== "ALL") {
      where.assignedToId = employeeId;
    }
    if (query) {
      where.OR = [
        { orderNumber: { contains: query } },
        { title: { contains: query } },
        { client: { name: { contains: query } } },
        { client: { phone: { contains: query } } },
        { client: { company: { contains: query } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        client: true,
        assignedTo: true,
        items: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      client,
      title,
      assignedToId,
      status = "NEW",
      priority = "NORMAL",
      deadline,
      installAddress,
      notes,
      previewUrl,
      items,
      totalAmount,
      advanceAmount = 0,
      paymentMethod = "CASH",
    } = body;

    // 1. Клиент
    let clientRecord = null;
    if (client.id) {
      clientRecord = await prisma.client.findUnique({ where: { id: client.id } });
    } else if (client.phone) {
      clientRecord = await prisma.client.findFirst({
        where: { phone: client.phone.trim() },
      });
    }

    if (!clientRecord) {
      clientRecord = await prisma.client.create({
        data: {
          name: client.name || "Клиент без имени",
          phone: client.phone || null,
          company: client.company || null,
        },
      });
    }

    // 2. Номер наряда
    const count = await prisma.order.count();
    const orderNumber = `ORD-${String(count + 101).padStart(3, "0")}`;

    const total = Number(totalAmount || 0);
    const advance = Number(advanceAmount || 0);
    const debt = Math.max(0, total - advance);

    // Автоматическая маршрутизация ответственного мастера цеха
    let finalAssignedToId = assignedToId;
    let finalStatus = status;

    const hasPrint = (items || []).some(
      (it: any) => it.serviceType === "BANNER" || it.serviceType === "ORACAL"
    );
    const hasAssembly = (items || []).some((it: any) =>
      ["LETTERS", "LIGHTBOX", "STAND", "INSTALL", "AUTO_BRANDING"].includes(it.serviceType)
    );

    const [albert, abzal] = await Promise.all([
      prisma.employee.findFirst({ where: { name: "Альберт" } }),
      prisma.employee.findFirst({ where: { name: "Абзал" } }),
    ]);

    if (!finalAssignedToId) {
      if (hasPrint && albert) {
        finalAssignedToId = albert.id;
        if (finalStatus === "NEW") finalStatus = "PRINTING";
      } else if (hasAssembly && abzal) {
        finalAssignedToId = abzal.id;
        if (finalStatus === "NEW") finalStatus = "ASSEMBLY";
      }
    } else {
      if (albert && finalAssignedToId === albert.id && finalStatus === "NEW") {
        finalStatus = "PRINTING";
      }
      if (abzal && finalAssignedToId === abzal.id && finalStatus === "NEW") {
        finalStatus = "ASSEMBLY";
      }
    }

    // 3. Создаем заказ
    const order = await prisma.order.create({
      data: {
        orderNumber,
        title: title || items?.[0]?.title || "Заказ наружной рекламы",
        clientId: clientRecord.id,
        assignedToId: finalAssignedToId || null,
        status: finalStatus,
        priority,
        deadline: deadline ? new Date(deadline) : null,
        installAddress: installAddress || null,
        notes: notes || null,
        previewUrl: previewUrl || null,
        totalAmount: total,
        paidAmount: advance,
        debtAmount: debt,
        items: {
          create: (items || []).map((it: any) => ({
            serviceType: it.serviceType || "CUSTOM",
            title: it.title,
            width: it.width ? Number(it.width) : null,
            height: it.height ? Number(it.height) : null,
            area: it.area ? Number(it.area) : null,
            quantity: it.quantity ? Number(it.quantity) : 1,
            letterHeight: it.letterHeight ? Number(it.letterHeight) : null,
            letterCount: it.letterCount ? Number(it.letterCount) : null,
            letterText: it.letterText || null,
            options: it.options || null,
            unitPrice: Number(it.unitPrice || 0),
            totalPrice: Number(it.totalPrice || 0),
          })),
        },
        payments:
          advance > 0
            ? {
                create: [
                  {
                    amount: advance,
                    method: paymentMethod,
                    notes: "Аванс при оформлении наряда",
                    receivedBy: "Жалгас",
                  },
                ],
              }
            : undefined,
      },
      include: {
        client: true,
        assignedTo: true,
        items: true,
        payments: true,
      },
    });

    // Отправка уведомления в Telegram-канал цеха
    try {
      const tgSetting = await prisma.telegramSetting.findUnique({ where: { id: "default" } });
      if (tgSetting && tgSetting.botToken && tgSetting.chatId && tgSetting.notifyNewOrder) {
        const priorityEmoji = order.priority === "URGENT" ? "🔥 СРОЧНО!" : "📋";
        const msg = `<b>${priorityEmoji} Новый наряд: ${order.orderNumber}</b>\n\n` +
          `🏷 <b>Изделие:</b> ${order.title}\n` +
          `👤 <b>Заказчик:</b> ${clientRecord.name}${clientRecord.phone ? ` (${clientRecord.phone})` : ""}\n` +
          `👷 <b>Мастер:</b> ${order.assignedTo ? order.assignedTo.name : "Не назначен"}\n` +
          `💰 <b>Сумма:</b> ${order.totalAmount.toLocaleString()} сум (Аванс: ${order.paidAmount.toLocaleString()})\n` +
          (order.deadline ? `⏰ <b>Срок сдачи:</b> ${new Date(order.deadline).toLocaleString("ru-RU")}\n` : "") +
          (order.installAddress ? `📍 <b>Монтаж:</b> ${order.installAddress}\n` : "");

        fetch(`https://api.telegram.org/bot${tgSetting.botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: tgSetting.chatId,
            text: msg,
            parse_mode: "HTML",
          }),
        }).catch((e) => console.error("Async TG error:", e));
      }
    } catch (tgErr) {
      console.error("TG notification error:", tgErr);
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
