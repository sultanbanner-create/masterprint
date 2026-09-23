import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");

    const where: any = {};
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { phone: { contains: query } },
        { company: { contains: query } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        orders: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            paidAmount: true,
            debtAmount: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const enriched = clients.map((c) => {
      const totalSpent = c.orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const debt = c.orders.reduce((sum, o) => sum + o.debtAmount, 0);
      return {
        ...c,
        totalOrders: c.orders.length,
        totalSpent,
        debt,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, company, notes } = body;

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const client = await prisma.client.create({
      data: {
        name,
        phone: phone || null,
        company: company || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
