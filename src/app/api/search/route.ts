import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    if (!q || q.length < 2) {
      return NextResponse.json({ orders: [], clients: [], materials: [], equipment: [] });
    }

    const [orders, clients, materials, equipment] = await Promise.all([
      prisma.order.findMany({
        where: {
          OR: [
            { orderNumber: { contains: q } },
            { title: { contains: q } },
            { client: { name: { contains: q } } },
            { client: { phone: { contains: q } } },
            { installAddress: { contains: q } },
            { notes: { contains: q } },
          ],
        },
        include: {
          client: true,
          assignedTo: true,
        },
        take: 6,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.client.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { company: { contains: q } },
          ],
        },
        include: {
          orders: { select: { id: true, debtAmount: true } },
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.stockMaterial.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { category: { contains: q } },
          ],
        },
        take: 5,
      }),
      prisma.equipment.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { assignedToName: { contains: q } },
            { notes: { contains: q } },
          ],
        },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        title: o.title,
        status: o.status,
        clientName: o.client?.name,
        assignedTo: o.assignedTo?.name,
        totalAmount: o.totalAmount,
        debtAmount: o.debtAmount,
        priority: o.priority,
      })),
      clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        company: c.company,
        totalOrders: c.orders.length,
        debt: c.orders.reduce((sum, ord) => sum + ord.debtAmount, 0),
      })),
      materials: materials.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        quantity: m.quantity,
        unit: m.unit,
        isLow: m.quantity <= m.minThreshold,
      })),
      equipment: equipment.map((eq) => ({
        id: eq.id,
        name: eq.name,
        type: eq.type,
        status: eq.status,
        assignedTo: eq.assignedToName,
      })),
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
