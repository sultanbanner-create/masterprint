const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding stock materials...");

  const materials = [
    {
      name: "Баннер литой 510г (рулон 3.2м)",
      category: "BANNER",
      quantity: 320,
      unit: "м²",
      minThreshold: 80,
      costPerUnit: 22000,
    },
    {
      name: "Баннер ламинированный 440г (рулон 3.2м)",
      category: "BANNER",
      quantity: 160,
      unit: "м²",
      minThreshold: 50,
      costPerUnit: 16000,
    },
    {
      name: "Пленка Oracal 641 Белая (рулон 1.26м)",
      category: "VINYL",
      quantity: 95,
      unit: "м²",
      minThreshold: 30,
      costPerUnit: 31000,
    },
    {
      name: "Пленка Oracal 641 Черная (рулон 1.26м)",
      category: "VINYL",
      quantity: 42,
      unit: "м²",
      minThreshold: 20,
      costPerUnit: 31000,
    },
    {
      name: "Пленка монтажная (рулон 1.0м)",
      category: "VINYL",
      quantity: 50,
      unit: "пог. м",
      minThreshold: 15,
      costPerUnit: 18000,
    },
    {
      name: "Акрил светорассеивающий 3мм (2.05×3.05м)",
      category: "SHEET",
      quantity: 8,
      unit: "листов",
      minThreshold: 3,
      costPerUnit: 580000,
    },
    {
      name: "ПВХ пластик 5мм (2.05×3.05м)",
      category: "SHEET",
      quantity: 12,
      unit: "листов",
      minThreshold: 4,
      costPerUnit: 420000,
    },
    {
      name: "ПВХ пластик 3мм (2.05×3.05м)",
      category: "SHEET",
      quantity: 5,
      unit: "листов",
      minThreshold: 5,
      costPerUnit: 290000,
    },
    {
      name: "Светодиодные модули LED 1.2W 12V (холодный белый)",
      category: "LED",
      quantity: 650,
      unit: "шт",
      minThreshold: 200,
      costPerUnit: 3200,
    },
    {
      name: "Блок питания влагозащитный IP67 12V 200W",
      category: "LED",
      quantity: 9,
      unit: "шт",
      minThreshold: 3,
      costPerUnit: 160000,
    },
    {
      name: "Блок питания интерьерный 12V 400W",
      category: "LED",
      quantity: 4,
      unit: "шт",
      minThreshold: 2,
      costPerUnit: 220000,
    },
    {
      name: "Люверсы оцинкованные 12мм",
      category: "HARDWARE",
      quantity: 2400,
      unit: "шт",
      minThreshold: 500,
      costPerUnit: 150,
    },
    {
      name: "Клей Cosmofen CA 12 (цианакрилат)",
      category: "HARDWARE",
      quantity: 14,
      unit: "шт",
      minThreshold: 5,
      costPerUnit: 38000,
    },
  ];

  for (const mat of materials) {
    const existing = await prisma.stockMaterial.findFirst({
      where: { name: mat.name },
    });
    if (!existing) {
      await prisma.stockMaterial.create({ data: mat });
    }
  }

  // Также добавим демо-комментарии/отчеты к заказам
  const order1 = await prisma.order.findUnique({ where: { orderNumber: "ORD-101" } });
  if (order1) {
    const commentsCount = await prisma.orderComment.count({ where: { orderId: order1.id } });
    if (commentsCount === 0) {
      await prisma.orderComment.create({
        data: {
          orderId: order1.id,
          authorName: "Альберт",
          text: "Баннер 6×3м отпечатан на станке. Чернила просохли, перехожу к установке люверсов через 25 см.",
        },
      });
    }
  }

  const order2 = await prisma.order.findUnique({ where: { orderNumber: "ORD-102" } });
  if (order2) {
    const commentsCount = await prisma.orderComment.count({ where: { orderId: order2.id } });
    if (commentsCount === 0) {
      await prisma.orderComment.create({
        data: {
          orderId: order2.id,
          authorName: "Абзал",
          text: "Лицевая часть букв вырезана из молочного акрила. Склеиваю борта из ПВХ 3мм и монтирую линзованные диоды.",
        },
      });
    }
  }

  console.log("Stock materials and initial comments seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
