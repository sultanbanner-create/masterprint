import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        orders: {
          include: {
            items: true,
            payments: true,
            assignedTo: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const totalSpent = client.orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const paidAmount = client.orders.reduce((sum, o) => sum + o.paidAmount, 0);
    const debtAmount = client.orders.reduce((sum, o) => sum + o.debtAmount, 0);
    const averageCheck = client.orders.length > 0 ? Math.round(totalSpent / client.orders.length) : 0;

    return NextResponse.json({
      ...client,
      totalOrders: client.orders.length,
      totalSpent,
      paidAmount,
      debtAmount,
      averageCheck,
    });
  } catch (error) {
    console.error("Failed to fetch client:", error);
    return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { name, phone, company, notes } = body;

    const updated = await prisma.client.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(company !== undefined && { company }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update client:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.client.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete client:", error);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
