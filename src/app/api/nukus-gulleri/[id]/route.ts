import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateUlugbekClient, NUKUS_BOX_CATALOG } from "@/lib/nukus-boxes";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = params.id;
    const ulugbek = await getOrCreateUlugbekClient();

    // Fetch client's cumulative balance and all orders for reconciliation
    const allOrders = await prisma.order.findMany({
      where: { clientId: ulugbek.id },
      include: {
        items: true,
        payments: true,
        assignedTo: true,
        comments: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalOrdersCount = allOrders.length;
    const totalOrderedAmount = allOrders.reduce((acc, o) => acc + o.totalAmount, 0);
    const totalPaidAmount = allOrders.reduce((acc, o) => acc + o.paidAmount, 0);
    const totalDebtAmount = allOrders.reduce((acc, o) => acc + o.debtAmount, 0);

    let totalBoxesAllTime = 0;
    allOrders.forEach((o) => {
      o.items.forEach((it) => {
        totalBoxesAllTime += it.quantity;
      });
    });

    let targetOrder: any = null;
    const isStatementMode = rawId === "statement" || rawId === "all";

    if (isStatementMode) {
      // Build a comprehensive composite statement order combining all shipments
      const allItems: any[] = [];
      allOrders.forEach((o) => {
        o.items.forEach((it) => {
          allItems.push({
            id: it.id,
            title: `${it.title} (накладная ${o.orderNumber})`,
            options: `${it.options || "Стандарт"} • Дата: ${new Date(o.createdAt).toLocaleDateString("ru-RU")}`,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalPrice: it.totalPrice,
            orderNumber: o.orderNumber,
          });
        });
      });

      targetOrder = {
        id: "statement",
        orderNumber: "NG-СВОДНЫЙ-АКТ",
        title: `Сводный реестр & Акт сверки всех отгрузок («Нукус гуллери»)`,
        status: totalDebtAmount === 0 ? "COMPLETED" : "READY",
        createdAt: allOrders[0]?.createdAt || new Date(),
        deadline: null,
        totalAmount: totalOrderedAmount,
        paidAmount: totalPaidAmount,
        debtAmount: totalDebtAmount,
        completedBy: totalDebtAmount === 0 ? "Улугбек (Нукус гуллери)" : null,
        completedAt: totalDebtAmount === 0 ? new Date() : null,
        notes: `Сводная ведомость всех партий коробок, отгруженных цехом Master Print для цветочного салона «Нукус гуллери» (Улугбек). Всего партий: ${totalOrdersCount}, всего коробок: ${totalBoxesAllTime} шт.`,
        items: allItems,
        client: ulugbek,
        payments: [],
        comments: [],
        isStatement: true,
      };
    } else if (rawId === "latest") {
      targetOrder = allOrders[0] || null;
    } else if (rawId.startsWith("NG-") || rawId.includes("-")) {
      targetOrder = allOrders.find((o) => o.orderNumber.toLowerCase() === rawId.toLowerCase()) || null;
      if (!targetOrder) {
        targetOrder = await prisma.order.findFirst({
          where: { orderNumber: rawId },
          include: {
            items: true,
            client: true,
            payments: true,
            assignedTo: true,
            comments: { orderBy: { createdAt: "desc" } },
          },
        });
      }
    } else {
      const numId = parseInt(rawId);
      if (!isNaN(numId)) {
        targetOrder = allOrders.find((o) => o.id === numId) || null;
        if (!targetOrder) {
          targetOrder = await prisma.order.findUnique({
            where: { id: numId },
            include: {
              items: true,
              client: true,
              payments: true,
              assignedTo: true,
              comments: { orderBy: { createdAt: "desc" } },
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      order: targetOrder,
      isStatement: isStatementMode,
      client: {
        id: ulugbek.id,
        name: ulugbek.name,
        company: ulugbek.company,
        phone: ulugbek.phone,
      },
      statement: {
        totalOrdersCount,
        totalOrderedAmount,
        totalPaidAmount,
        totalDebtAmount,
        totalBoxesAllTime,
        orders: allOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          title: o.title,
          status: o.status,
          createdAt: o.createdAt,
          totalAmount: o.totalAmount,
          debtAmount: o.debtAmount,
          completedBy: o.completedBy,
          completedAt: o.completedAt,
          boxesCount: o.items.reduce((acc, it) => acc + it.quantity, 0),
        })),
      },
      catalog: NUKUS_BOX_CATALOG,
    });
  } catch (error: any) {
    console.error("Error in GET /api/nukus-gulleri/[id]:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка получения данных наряда" },
      { status: 500 }
    );
  }
}
