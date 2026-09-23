import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = parseInt(params.id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        movements: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Проверяем, не были ли уже списаны материалы по этому наряду
    if (order.movements && order.movements.length > 0) {
      return NextResponse.json({
        message: "Материалы по этому наряду уже были списаны ранее",
        movements: order.movements,
        alreadyDeducted: true,
      });
    }

    const allMaterials = await prisma.stockMaterial.findMany();
    const banner510 = allMaterials.find((m) => m.name.includes("литой 510г")) || allMaterials.find((m) => m.category === "BANNER");
    const eyelets = allMaterials.find((m) => m.name.includes("Люверсы"));
    const oracal = allMaterials.find((m) => m.name.includes("Oracal 641 Белая")) || allMaterials.find((m) => m.category === "VINYL");
    const leds = allMaterials.find((m) => m.name.includes("Светодиодные")) || allMaterials.find((m) => m.category === "LED");
    const acrylic = allMaterials.find((m) => m.name.includes("Акрил")) || allMaterials.find((m) => m.category === "SHEET");
    const pvc = allMaterials.find((m) => m.name.includes("ПВХ 3мм")) || allMaterials.find((m) => m.name.includes("ПВХ"));

    const createdMovements: any[] = [];

    for (const item of order.items) {
      if (item.serviceType === "BANNER" && item.area && banner510) {
        // Списание баннерной ткани
        const qtyToDeduct = Math.round(item.area * 100) / 100;
        await prisma.stockMaterial.update({
          where: { id: banner510.id },
          data: { quantity: { decrement: qtyToDeduct } },
        });

        const m1 = await prisma.stockMovement.create({
          data: {
            materialId: banner510.id,
            orderId: order.id,
            type: "DEDUCTION",
            quantity: qtyToDeduct,
            description: `Списание на печать ${item.title} (${qtyToDeduct} м²)`,
          },
        });
        createdMovements.push(m1);

        // Расчет и списание люверсов
        if (eyelets) {
          const w = item.width || 3;
          const h = item.height || 1;
          const eyeletCount = Math.ceil(((w + h) * 2) / 0.3) * (item.quantity || 1);
          await prisma.stockMaterial.update({
            where: { id: eyelets.id },
            data: { quantity: { decrement: eyeletCount } },
          });

          const mEye = await prisma.stockMovement.create({
            data: {
              materialId: eyelets.id,
              orderId: order.id,
              type: "DEDUCTION",
              quantity: eyeletCount,
              description: `Люверсы на ${item.title} (${eyeletCount} шт)`,
            },
          });
          createdMovements.push(mEye);
        }
      } else if (item.serviceType === "LETTERS" && item.letterCount && item.letterHeight) {
        // Списание светодиодных модулей (примерно 1 диод на каждые 4-5 см высоты буквы)
        if (leds) {
          const diodesPerLetter = Math.max(3, Math.round(item.letterHeight / 4));
          const totalLeds = diodesPerLetter * item.letterCount;
          await prisma.stockMaterial.update({
            where: { id: leds.id },
            data: { quantity: { decrement: totalLeds } },
          });

          const mLed = await prisma.stockMovement.create({
            data: {
              materialId: leds.id,
              orderId: order.id,
              type: "DEDUCTION",
              quantity: totalLeds,
              description: `LED модули для вывески (${item.letterCount} букв × ${item.letterHeight}см)`,
            },
          });
          createdMovements.push(mLed);
        }

        // Списание листового акрила/ПВХ (доля листа)
        if (acrylic) {
          const sheetFraction = 0.25; // 1/4 листа в среднем на стандартную надпись
          await prisma.stockMaterial.update({
            where: { id: acrylic.id },
            data: { quantity: { decrement: sheetFraction } },
          });

          const mAcr = await prisma.stockMovement.create({
            data: {
              materialId: acrylic.id,
              orderId: order.id,
              type: "DEDUCTION",
              quantity: sheetFraction,
              description: `Акрил светорассеивающий на лицевую часть букв`,
            },
          });
          createdMovements.push(mAcr);
        }
      } else if ((item.serviceType === "ORACAL" || item.serviceType === "AUTO_BRANDING") && item.area && oracal) {
        const qtyToDeduct = Math.round(item.area * 100) / 100;
        await prisma.stockMaterial.update({
          where: { id: oracal.id },
          data: { quantity: { decrement: qtyToDeduct } },
        });

        const mOra = await prisma.stockMovement.create({
          data: {
            materialId: oracal.id,
            orderId: order.id,
            type: "DEDUCTION",
            quantity: qtyToDeduct,
            description: `Списание пленки Oracal на ${item.title}`,
          },
        });
        createdMovements.push(mOra);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Материалы успешно списаны со склада по наряду ${order.orderNumber}`,
      movementsCount: createdMovements.length,
      movements: createdMovements,
    });
  } catch (error) {
    console.error("Failed to deduct stock:", error);
    return NextResponse.json({ error: "Failed to deduct stock" }, { status: 500 });
  }
}
