import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import {
  NUKUS_BOX_CATALOG,
  getOrCreateUlugbekClient,
  getAbzalEmployee,
} from "@/lib/nukus-boxes";

export async function GET() {
  try {
    const ulugbek = await getOrCreateUlugbekClient();
    const abzal = await getAbzalEmployee();

    // Загружаем все заказы по коробкам Нукус гуллери
    const orders = await prisma.order.findMany({
      where: {
        clientId: ulugbek.id,
      },
      include: {
        items: true,
        assignedTo: true,
        payments: true,
        comments: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Расчет финансовой задолженности Улугбека
    const totalOrdersCount = orders.length;
    const totalOrderAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalPaidAmount = orders.reduce((sum, o) => sum + o.paidAmount, 0);
    // Суммарный долг — это сумма всех неоплаченных остатков
    const totalDebtAmount = orders.reduce((sum, o) => sum + o.debtAmount, 0);

    // Подсчет количества коробок суммарно и в разрезе моделей и цветов
    let totalBoxesCount = 0;
    const modelStats: Record<
      string,
      { name: string; dimensions: string; price: number; totalCount: number; blackCount: number; whiteCount: number; exclusiveCount: number; totalRevenue: number }
    > = {};

    NUKUS_BOX_CATALOG.forEach((box) => {
      modelStats[box.id] = {
        name: box.name,
        dimensions: box.dimensions,
        price: box.price,
        totalCount: 0,
        blackCount: 0,
        whiteCount: 0,
        exclusiveCount: 0,
        totalRevenue: 0,
      };
    });

    orders.forEach((order) => {
      order.items.forEach((item) => {
        totalBoxesCount += item.quantity;

        // Поиск модели по заголовку или названию
        const found = NUKUS_BOX_CATALOG.find((m) =>
          item.title.toLowerCase().includes(m.name.toLowerCase())
        );

        const key = found ? found.id : "cylinder_20_20";
        if (modelStats[key]) {
          modelStats[key].totalCount += item.quantity;
          modelStats[key].totalRevenue += item.totalPrice;

          const opt = (item.options || "").toLowerCase();
          if (opt.includes("черн")) {
            modelStats[key].blackCount += item.quantity;
          } else if (opt.includes("бел")) {
            modelStats[key].whiteCount += item.quantity;
          } else {
            modelStats[key].exclusiveCount += item.quantity;
          }
        }
      });
    });

    // Выработка мастера Абзала по коробкам
    const abzalBoxOrders = orders.filter(
      (o) => o.assignedToId === abzal?.id || o.assignedTo?.name === "Абзал"
    );
    const abzalCompletedSum = abzalBoxOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const abzalBoxesCount = abzalBoxOrders.reduce(
      (sum, o) => sum + o.items.reduce((iSum, it) => iSum + it.quantity, 0),
      0
    );

    return NextResponse.json({
      success: true,
      client: {
        id: ulugbek.id,
        name: ulugbek.name,
        company: ulugbek.company,
        phone: ulugbek.phone,
        totalDebt: totalDebtAmount,
        totalOrdered: totalOrderAmount,
        totalPaid: totalPaidAmount,
        ordersCount: totalOrdersCount,
      },
      stats: {
        totalBoxesCount,
        totalDebtAmount,
        totalOrderAmount,
        totalPaidAmount,
        modelStats: Object.values(modelStats),
      },
      abzalStats: {
        employeeId: abzal?.id,
        name: abzal?.name || "Абзал",
        completedSum: abzalCompletedSum,
        boxesCount: abzalBoxesCount,
        batchesCount: abzalBoxOrders.length,
      },
      catalog: NUKUS_BOX_CATALOG,
      recentBatches: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        title: o.title,
        status: o.status,
        totalAmount: o.totalAmount,
        paidAmount: o.paidAmount,
        debtAmount: o.debtAmount,
        createdAt: o.createdAt,
        assignedToName: o.assignedTo?.name || "Абзал",
        items: o.items.map((it) => ({
          id: it.id,
          title: it.title,
          options: it.options,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
        })),
      })),
    });
  } catch (error: any) {
    console.error("Error fetching Nukus boxes production data:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении данных производства" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("mp_auth_session")?.value;
    const currentUser = token ? verifyToken(token) : null;

    const body = await req.json();
    const { items, notes } = body as {
      items: Array<{ boxId: string; color: string; quantity: number }>;
      notes?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Не выбрано ни одной коробки для сдачи партии" },
        { status: 400 }
      );
    }

    // Фильтруем позиции с количеством > 0
    const validItems = items.filter((it) => it.quantity > 0);
    if (validItems.length === 0) {
      return NextResponse.json(
        { error: "Укажите количество хотя бы для одной коробки" },
        { status: 400 }
      );
    }

    const ulugbek = await getOrCreateUlugbekClient();
    const abzal = await getAbzalEmployee();

    // Назначаем ответственным либо авторизованного Абзала, либо системного Абзала
    const assignedId =
      currentUser?.role === "WORKSHOP_ASSEMBLY"
        ? currentUser.id
        : abzal?.id;

    // Рассчитываем позиции наряда
    let totalBatchAmount = 0;
    let totalBatchQuantity = 0;
    const itemDetails: Array<{
      serviceType: string;
      title: string;
      options: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    for (const it of validItems) {
      const catalogItem = NUKUS_BOX_CATALOG.find((c) => c.id === it.boxId);
      if (!catalogItem) continue;

      const unitPrice = catalogItem.price;
      const totalPrice = unitPrice * it.quantity;
      totalBatchAmount += totalPrice;
      totalBatchQuantity += it.quantity;

      itemDetails.push({
        serviceType: "BOXES_NUKUS",
        title: `${catalogItem.name} (${catalogItem.dimensions})`,
        options: `Цвет: ${it.color || "Черный"}`,
        quantity: it.quantity,
        unitPrice,
        totalPrice,
      });
    }

    if (itemDetails.length === 0) {
      return NextResponse.json(
        { error: "Некорректные параметры коробок" },
        { status: 400 }
      );
    }

    // Генерируем уникальный номер заказа, например NG-2609-842
    const now = new Date();
    const datePart = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, "0")}`;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const orderNumber = `NG-${datePart}-${randomSuffix}`;

    const summaryList = itemDetails
      .map((i) => `${i.title} [${i.options}]: ${i.quantity} шт.`)
      .join(", ");

    // Создаем заказ в базе данных
    // Статус READY (готов / сдан мастером), долг = полной сумме партии
    const createdOrder = await prisma.order.create({
      data: {
        orderNumber,
        title: `Партия коробок: Нукус гуллери (${totalBatchQuantity} шт.)`,
        clientId: ulugbek.id,
        assignedToId: assignedId,
        status: "READY",
        priority: "NORMAL",
        deadline: new Date(),
        totalAmount: totalBatchAmount,
        paidAmount: 0,
        debtAmount: totalBatchAmount,
        notes:
          notes ||
          `Партия подарочных коробок сдана мастером Абзалом для клиента Улугбек («Нукус гуллери»). Позиции: ${summaryList}`,
        items: {
          create: itemDetails,
        },
        comments: {
          create: [
            {
              authorId: assignedId,
              authorName: currentUser?.name || abzal?.name || "Абзал",
              text: `📦 Мастер Абзал изготовил и сдал партию коробок: ${summaryList}. Сумма наряда: ${totalBatchAmount.toLocaleString()} сум. Начислен долг клиенту Улугбек.`,
            },
          ],
        },
      },
      include: {
        items: true,
        client: true,
        assignedTo: true,
      },
    });

    // Пересчитываем новый суммарный долг Улугбека
    const allUlugbekOrders = await prisma.order.findMany({
      where: { clientId: ulugbek.id },
      select: { debtAmount: true },
    });
    const updatedTotalDebt = allUlugbekOrders.reduce(
      (sum, o) => sum + o.debtAmount,
      0
    );

    return NextResponse.json({
      success: true,
      message: `Партия коробок успешно принята! Долг Улугбека увеличен на ${totalBatchAmount.toLocaleString()} сум.`,
      order: createdOrder,
      totalBatchAmount,
      totalBatchQuantity,
      updatedTotalDebt,
    });
  } catch (error: any) {
    console.error("Error creating Nukus boxes order:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при сохранении партии коробок" },
      { status: 500 }
    );
  }
}
