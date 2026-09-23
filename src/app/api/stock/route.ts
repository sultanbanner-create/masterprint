import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const materials = await prisma.stockMaterial.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const lowStockCount = materials.filter(
      (m) => m.quantity <= m.minThreshold
    ).length;

    const totalStockValue = materials.reduce(
      (sum, m) => sum + m.quantity * m.costPerUnit,
      0
    );

    return NextResponse.json({
      materials,
      summary: {
        totalItems: materials.length,
        lowStockCount,
        totalStockValue,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch stock materials" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, category, quantity, unit, minThreshold, costPerUnit } = body;

    if (!name || !unit) {
      return NextResponse.json(
        { error: "Название и единица измерения обязательны" },
        { status: 400 }
      );
    }

    const material = await prisma.stockMaterial.create({
      data: {
        name,
        category: category || "OTHER",
        quantity: parseFloat(quantity) || 0,
        unit,
        minThreshold: parseFloat(minThreshold) || 10,
        costPerUnit: parseFloat(costPerUnit) || 0,
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create material" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, delta, exactQuantity, costPerUnit, minThreshold } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing material ID" }, { status: 400 });
    }

    const current = await prisma.stockMaterial.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    let newQuantity = current.quantity;
    if (exactQuantity !== undefined) {
      newQuantity = parseFloat(exactQuantity);
    } else if (delta !== undefined) {
      newQuantity = Math.max(0, current.quantity + parseFloat(delta));
    }

    const updated = await prisma.stockMaterial.update({
      where: { id },
      data: {
        quantity: newQuantity,
        ...(costPerUnit !== undefined ? { costPerUnit: parseFloat(costPerUnit) } : {}),
        ...(minThreshold !== undefined ? { minThreshold: parseFloat(minThreshold) } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update material" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing material ID" }, { status: 400 });
    }

    await prisma.stockMaterial.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete material" },
      { status: 500 }
    );
  }
}
