const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding employees...");

  // 1. Создаем 4 сотрудников компании
  const timur = await prisma.employee.create({
    data: {
      name: "Тимур",
      role: "DIRECTOR",
      roleTitle: "Директор",
      phone: "+998 90 000 00 01",
    },
  });

  const jalgas = await prisma.employee.create({
    data: {
      name: "Жалгас",
      role: "SALES_DESIGNER",
      roleTitle: "Менеджер по продажам & Дизайнер",
      phone: "+998 90 111 22 33",
    },
  });

  const abzal = await prisma.employee.create({
    data: {
      name: "Абзал",
      role: "WORKSHOP_ASSEMBLY",
      roleTitle: "Мастер сборки & Монтаж",
      phone: "+998 91 222 33 44",
    },
  });

  const albert = await prisma.employee.create({
    data: {
      name: "Альберт",
      role: "WORKSHOP_PRINTING",
      roleTitle: "Мастер & Печатник баннера",
      phone: "+998 93 333 44 55",
    },
  });

  console.log("Employees created:", { timur: timur.name, jalgas: jalgas.name, abzal: abzal.name, albert: albert.name });

  // 2. Создаем клиентов
  const client1 = await prisma.client.create({
    data: {
      name: "Рустам ака",
      phone: "+998 90 123 45 67",
      company: "Ресторан 'Арал'",
      notes: "Срочный заказ к открытию в пятницу",
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: "Гульнара эже",
      phone: "+998 91 765 43 21",
      company: "Аптека 'DORIXONA 24/7'",
      notes: "Требуется монтаж световых букв на высоте 3.5м",
    },
  });

  const client3 = await prisma.client.create({
    data: {
      name: "Баходир",
      phone: "+998 93 456 78 90",
      company: "Автомойка 'FAST WASH'",
      notes: "Печать баннера с люверсами и оклейка бокса",
    },
  });

  // 3. Создаем заказы с назначенными мастерами и точными сроками исполнения (дедлайнами)
  const now = new Date();

  // Заказ 1: Печать баннера — назначен Альберт, дедлайн сегодня через 4 часа (горящий!)
  const deadline1 = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  await prisma.order.create({
    data: {
      orderNumber: "ORD-101",
      title: "Печать фасадного баннера 6×3м с люверсами",
      clientId: client1.id,
      assignedToId: albert.id,
      status: "PRINTING",
      priority: "URGENT",
      deadline: deadline1,
      installAddress: "ул. Дослык, 18 (Ресторан Арал)",
      notes: "Литой баннер 510г, усиленная проклейка полей, люверсы через каждые 25 см",
      totalAmount: 680000,
      paidAmount: 400000,
      debtAmount: 280000,
      items: {
        create: [
          {
            serviceType: "BANNER",
            title: "Печать литого баннера 6×3м (18 м²)",
            width: 6,
            height: 3,
            area: 18,
            unitPrice: 35000,
            totalPrice: 630000,
            options: "Люверсы 25см, проклейка края",
          },
          {
            serviceType: "INSTALL",
            title: "Доставка и натяжка на каркас",
            quantity: 1,
            unitPrice: 50000,
            totalPrice: 50000,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 400000,
            method: "CARD",
            notes: "Предоплата через Click",
            receivedBy: "Жалгас",
          },
        ],
      },
    },
  });

  // Заказ 2: Световые буквы — назначен Абзал, дедлайн через 2 дня
  const deadline2 = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  await prisma.order.create({
    data: {
      orderNumber: "ORD-102",
      title: "Объемные световые буквы 'DORIXONA 24/7'",
      clientId: client2.id,
      assignedToId: abzal.id,
      status: "ASSEMBLY",
      priority: "NORMAL",
      deadline: deadline2,
      installAddress: "Проспект Нукус, 5",
      notes: "Акрил светорассеивающий 3мм, линзованные светодиоды 1.2W, герметичный блок IP67",
      totalAmount: 1850000,
      paidAmount: 1000000,
      debtAmount: 850000,
      items: {
        create: [
          {
            serviceType: "LETTERS",
            title: "Световые буквы 'DORIXONA 24/7' (11 букв × 25см)",
            letterText: "DORIXONA247",
            letterCount: 11,
            letterHeight: 25,
            unitPrice: 6500,
            totalPrice: 1787500,
            options: "Светорассеивающий акрил, LED линзованные",
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 1000000,
            method: "CASH",
            notes: "Аванс наличными в кассу",
            receivedBy: "Жалгас",
          },
        ],
      },
    },
  });

  // Заказ 3: Макет и дизайн — назначен Жалгас, дедлайн завтра в 12:00
  const deadline3 = new Date(now.getTime() + 20 * 60 * 60 * 1000);
  await prisma.order.create({
    data: {
      orderNumber: "ORD-103",
      title: "Отрисовка макета вывески и оклейки бокса",
      clientId: client3.id,
      assignedToId: jalgas.id,
      status: "DESIGN",
      priority: "NORMAL",
      deadline: deadline3,
      installAddress: "Объездная дорога, Автомойка Fast Wash",
      notes: "Подготовить файл CorelDRAW .cdr в CMYK и отправить заказчику на WhatsApp",
      totalAmount: 350000,
      paidAmount: 350000,
      debtAmount: 0,
      items: {
        create: [
          {
            serviceType: "CUSTOM",
            title: "Дизайн-макет и визуализация на фасаде",
            quantity: 1,
            unitPrice: 150000,
            totalPrice: 150000,
          },
          {
            serviceType: "ORACAL",
            title: "Печать пленки Oracal (4 м²)",
            width: 2,
            height: 2,
            area: 4,
            unitPrice: 50000,
            totalPrice: 200000,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 350000,
            method: "CASH",
            notes: "Полная оплата",
            receivedBy: "Жалгас",
          },
        ],
      },
    },
  });

  console.log("Demo seed successfully finished!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
