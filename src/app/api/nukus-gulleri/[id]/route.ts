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

    let targetOrder = null;

    if (rawId === "latest") {
      targetOrder = await prisma.order.findFirst({
        where: { clientId: ulugbek.id },
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
          client: true,
          payments: true,
          assignedTo: true,
          comments: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    } else if (rawId.startsWith("NG-")) {
      targetOrder = await prisma.order.findFirst({
        where: { orderNumber: rawId },
        include: {
          items: true,
          client: true,
          payments: true,
          assignedTo: true,
          comments: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    } else {
      const numId = parseInt(rawId);
      if (!isNaN(numId)) {
        targetOrder = await prisma.order.findUnique({
          where: { id: numId },
          include: {
            items: true,
            client: true,
            payments: true,
            assignedTo: true,
            comments: {
              orderBy: { createdAt: "desc" },
            },
          },
        });
      }
    }

    // Also fetch client's cumulative balance and all orders for reconciliation
    const allOrders = await prisma.order.findMany({
      where: { clientId: ulugbek.id },
      include: {
        items: true,
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

    return NextResponse.json({
      success: true,
      order: targetOrder,
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
