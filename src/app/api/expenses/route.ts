import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Helper для проверки сессии (опционально, если пользователь залогинен в вебе)
async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("mp_auth_session")?.value || cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

// GET: Список расходов с фильтрацией и итоговой аналитикой
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderIdParam = searchParams.get("orderId");
    const categoryParam = searchParams.get("category");
    const spentByNameParam = searchParams.get("spentByName");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const where: any = {};

    if (orderIdParam) {
      if (orderIdParam === "none" || orderIdParam === "overhead") {
        where.orderId = null;
      } else {
        const parsedOrderId = parseInt(orderIdParam, 10);
        if (!isNaN(parsedOrderId)) {
          where.orderId = parsedOrderId;
        }
      }
    }

    if (categoryParam && categoryParam !== "ALL") {
      where.category = categoryParam;
    }

    if (spentByNameParam) {
      where.spentByName = { contains: spentByNameParam, mode: "insensitive" };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            title: true,
            status: true,
            client: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Расчет агрегированной сводки
    const allExpenses = await prisma.expense.findMany({
      select: {
        amount: true,
        category: true,
        orderId: true,
      },
    });

    const summary = {
      totalAmount: allExpenses.reduce((sum, e) => sum + e.amount, 0),
      materialsAmount: allExpenses.filter(e => e.category === "MATERIALS").reduce((sum, e) => sum + e.amount, 0),
      consumablesAmount: allExpenses.filter(e => e.category === "CONSUMABLES").reduce((sum, e) => sum + e.amount, 0),
      transportAmount: allExpenses.filter(e => e.category === "TRANSPORT").reduce((sum, e) => sum + e.amount, 0),
      otherAmount: allExpenses.filter(e => e.category === "OTHER").reduce((sum, e) => sum + e.amount, 0),
      orderSpecificAmount: allExpenses.filter(e => e.orderId !== null).reduce((sum, e) => sum + e.amount, 0),
      overheadAmount: allExpenses.filter(e => e.orderId === null).reduce((sum, e) => sum + e.amount, 0),
      count: allExpenses.length,
    };

    return NextResponse.json({ expenses, summary });
  } catch (error: any) {
    console.error("[Expenses API Error]:", error);
    return NextResponse.json({ error: "Failed to fetch expenses", details: error.message }, { status: 500 });
  }
}

// POST: Добавление расхода (из ERP или внешнего интегратора)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const {
      orderId,
      orderNumber,
      title,
      amount,
      category = "CONSUMABLES",
      spentByName,
      receiptUrl,
      notes,
    } = body;

    if (!title || !amount || isNaN(Number(amount))) {
      return NextResponse.json(
        { error: "Название расхода и сумма обязательны" },
        { status: 400 }
      );
    }

    let resolvedOrderId: number | null = null;

    if (orderId) {
      resolvedOrderId = Number(orderId);
    } else if (orderNumber) {
      // Поиск заказа по номеру (например ORD-101 или 101)
      const cleanNum = orderNumber.toString().replace(/[^0-9]/g, "");
      const foundOrder = await prisma.order.findFirst({
        where: {
          OR: [
            { orderNumber: orderNumber },
            { orderNumber: `ORD-${cleanNum}` },
            { id: parseInt(cleanNum, 10) || 0 },
          ],
        },
      });
      if (foundOrder) {
        resolvedOrderId = foundOrder.id;
      }
    }

    // Определяем имя сотрудника
    const authorName = spentByName || user?.name || "Цех Master Print";

    const expense = await prisma.expense.create({
      data: {
        orderId: resolvedOrderId,
        title: title.trim(),
        amount: Math.abs(Number(amount)),
        category: ["MATERIALS", "CONSUMABLES", "TRANSPORT", "OTHER"].includes(category)
          ? category
          : "CONSUMABLES",
        spentByName: authorName,
        receiptUrl: receiptUrl || null,
        notes: notes ? notes.trim() : null,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    console.error("[Create Expense Error]:", error);
    return NextResponse.json(
      { error: "Не удалось сохранить расход", details: error.message },
      { status: 500 }
    );
  }
}
