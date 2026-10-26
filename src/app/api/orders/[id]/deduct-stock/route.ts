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

    const createdMovements = await prisma.$transaction(async (tx) => {
      const existingMovements = await tx.stockMovement.findMany({
        where: { orderId: order.id },
      });
      if (existingMovements.length > 0) {
        return { alreadyDeducted: true, movements: existingMovements };
      }

      const allMaterials = await tx.stockMaterial.findMany();
      const banner510 = allMaterials.find((m) => m.name.includes("литой 510г")) || allMaterials.find((m) => m.category === "BANNER");
      const eyelets = allMaterials.find((m) => m.name.includes("Люверсы"));
      const oracal = allMaterials.find((m) => m.name.includes("Oracal 641 Белая")) || allMaterials.find((m) => m.category === "VINYL");
      const leds = allMaterials.find((m) => m.name.includes("Светодиодные")) || allMaterials.find((m) => m.category === "LED");
      const acrylic = allMaterials.find((m) => m.name.includes("Акрил")) || allMaterials.find((m) => m.category === "SHEET");

      const movements: any[] = [];

      for (const item of order.items) {
        const qtyMultiplier = Math.max(1, item.quantity || 1);

        if (item.serviceType === "BANNER" && item.area && banner510) {
          // Списание баннерной ткани с учетом тиража (quantity)
          const totalArea = item.area * qtyMultiplier;
          const qtyToDeduct = Math.round(totalArea * 100) / 100;
          await tx.stockMaterial.update({
            where: { id: banner510.id },
            data: { quantity: { decrement: qtyToDeduct } },
          });

          const m1 = await tx.stockMovement.create({
            data: {
              materialId: banner510.id,
              orderId: order.id,
              type: "DEDUCTION",
              quantity: qtyToDeduct,
              description: `Списание на печать ${item.title} (${qtyToDeduct} м², ${qtyMultiplier} шт.)`,
            },
          });
          movements.push(m1);

          // Расчет и списание люверсов
          if (eyelets) {
            const w = item.width || 3;
            const h = item.height || 1;
            const eyeletCount = Math.ceil(((w + h) * 2) / 0.3) * qtyMultiplier;
            await tx.stockMaterial.update({
              where: { id: eyelets.id },
              data: { quantity: { decrement: eyeletCount } },
            });

            const mEye = await tx.stockMovement.create({
              data: {
                materialId: eyelets.id,
                orderId: order.id,
                type: "DEDUCTION",
                quantity: eyeletCount,
                description: `Люверсы на ${item.title} (${eyeletCount} шт)`,
              },
            });
            movements.push(mEye);
          }
        } else if (item.serviceType === "LETTERS" && item.letterCount && item.letterHeight) {
          // Списание светодиодных модулей (примерно 1 диод на каждые 4-5 см высоты буквы)
          if (leds) {
            const diodesPerLetter = Math.max(3, Math.round(item.letterHeight / 4));
            const totalLeds = diodesPerLetter * item.letterCount * qtyMultiplier;
            await tx.stockMaterial.update({
              where: { id: leds.id },
              data: { quantity: { decrement: totalLeds } },
            });

            const mLed = await tx.stockMovement.create({
              data: {
                materialId: leds.id,
                orderId: order.id,
                type: "DEDUCTION",
                quantity: totalLeds,
                description: `LED модули для вывески (${item.letterCount} букв × ${item.letterHeight}см × ${qtyMultiplier} шт.)`,
              },
            });
            movements.push(mLed);
          }

          // Списание листового акрила/ПВХ (доля листа)
          if (acrylic) {
            const sheetFraction = Math.round(0.25 * qtyMultiplier * 100) / 100;
            await tx.stockMaterial.update({
              where: { id: acrylic.id },
              data: { quantity: { decrement: sheetFraction } },
            });

            const mAcr = await tx.stockMovement.create({
              data: {
                materialId: acrylic.id,
                orderId: order.id,
                type: "DEDUCTION",
                quantity: sheetFraction,
                description: `Акрил светорассеивающий на лицевую часть букв (${qtyMultiplier} шт.)`,
              },
            });
            movements.push(mAcr);
          }
        } else if ((item.serviceType === "ORACAL" || item.serviceType === "AUTO_BRANDING") && item.area && oracal) {
          const totalArea = item.area * qtyMultiplier;
          const qtyToDeduct = Math.round(totalArea * 100) / 100;
          await tx.stockMaterial.update({
            where: { id: oracal.id },
            data: { quantity: { decrement: qtyToDeduct } },
          });

          const mOra = await tx.stockMovement.create({
            data: {
              materialId: oracal.id,
              orderId: order.id,
              type: "DEDUCTION",
              quantity: qtyToDeduct,
              description: `Списание пленки Oracal на ${item.title} (${qtyToDeduct} м², ${qtyMultiplier} шт.)`,
            },
          });
          movements.push(mOra);
        }
      }

      return { alreadyDeducted: false, movements };
    });

    if (createdMovements.alreadyDeducted) {
      return NextResponse.json({
        message: "Материалы по этому наряду уже были списаны ранее",
        movements: createdMovements.movements,
        alreadyDeducted: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Материалы успешно списаны со склада по наряду ${order.orderNumber}`,
      movementsCount: createdMovements.movements.length,
      movements: createdMovements.movements,
    });
  } catch (error) {
    console.error("Failed to deduct stock:", error);
    return NextResponse.json({ error: "Failed to deduct stock" }, { status: 500 });
  }
}
