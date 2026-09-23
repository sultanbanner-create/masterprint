import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Начальные данные оборудования мастерской наружной рекламы
const INITIAL_EQUIPMENT = [
  {
    name: "Широкоформатный принтер 3.2м Phaeton Galaxy",
    type: "PRINTER",
    status: "WARNING",
    assignedToName: "Альберт",
    cyanLevel: 80,
    magentaLevel: 45,
    yellowLevel: 75,
    blackLevel: 25,
    notes: "Головки Konica Minolta 512i (4 шт). Скорость 120 м²/ч. Чернила сольвентные.",
    logs: {
      create: [
        {
          action: "Калибровка шага подачи и головки Black",
          performedBy: "Альберт",
          cost: 0,
          notes: "Тестовая печать на баннере 440г в норме",
        },
        {
          action: "Замена помпы сольвентной системы",
          performedBy: "Альберт",
          cost: 250000,
          notes: "Установлена новая мембранная помпа",
        },
      ],
    },
  },
  {
    name: "Фрезерно-гравировальный ЧПУ станок 1325 (3.5 кВт)",
    type: "CNC",
    status: "OK",
    assignedToName: "Абзал",
    cyanLevel: null,
    magentaLevel: null,
    yellowLevel: null,
    blackLevel: null,
    notes: "Рабочее поле 1300x2500 мм. Для раскроя акрила, ПВХ и композитных панелей.",
    logs: {
      create: [
        {
          action: "Замена спиральной фрезы 3.175мм (1 заход)",
          performedBy: "Абзал",
          cost: 65000,
          notes: "Для чистовой резки молочного оргстекла 3мм",
        },
        {
          action: "Смазка направляющих Hiwin и замена помпы СОЖ",
          performedBy: "Абзал",
          cost: 120000,
          notes: "Плановое ТО направляющих",
        },
      ],
    },
  },
  {
    name: "Режущий плоттер Roland CAMM-1 Pro (1300мм)",
    type: "PLOTTER",
    status: "OK",
    assignedToName: "Жалгас",
    cyanLevel: null,
    magentaLevel: null,
    yellowLevel: null,
    blackLevel: null,
    notes: "Резка самоклеящейся пленки Oracal 641/8500. Оптический датчик позиционирования.",
    logs: {
      create: [
        {
          action: "Установка ножа 45 градусов",
          performedBy: "Жалгас",
          cost: 45000,
          notes: "Резка мелких текстов для табличек",
        },
      ],
    },
  },
  {
    name: "Сварочный полуавтомат MIG/MMA 250A",
    type: "WELDING",
    status: "OK",
    assignedToName: "Абзал",
    cyanLevel: null,
    magentaLevel: null,
    yellowLevel: null,
    blackLevel: null,
    notes: "Для изготовления несущих металлоконструкций, стел и рам вывесок из профтрубы 20х20, 40х20, 50х50.",
    logs: {
      create: [
        {
          action: "Заправка баллона углекислотой (CO2)",
          performedBy: "Абзал",
          cost: 95000,
          notes: "Баллон 40л на складе",
        },
      ],
    },
  },
  {
    name: "Служебный автофургон Chevrolet Labo (Бортовой/Тент)",
    type: "VEHICLE",
    status: "OK",
    assignedToName: "Абзал",
    cyanLevel: null,
    magentaLevel: null,
    yellowLevel: null,
    blackLevel: null,
    notes: "Транспортировка вывесок, лестниц, лесов и монтажной бригады на объекты.",
    logs: {
      create: [
        {
          action: "Плановое ТО: масло моторное 5W-30, масляный фильтр",
          performedBy: "Абзал",
          cost: 380000,
          notes: "Пробег 48 500 км",
        },
      ],
    },
  },
];

export async function GET() {
  try {
    let count = await prisma.equipment.count();
    if (count === 0) {
      for (const item of INITIAL_EQUIPMENT) {
        await prisma.equipment.create({
          data: item,
        });
      }
    }

    const equipment = await prisma.equipment.findMany({
      include: {
        logs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ equipment });
  } catch (error) {
    console.error("Failed to fetch equipment:", error);
    return NextResponse.json(
      { error: "Failed to fetch equipment" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Добавление записи журнала обслуживания (ТО / Замена расходника / Доливка чернил)
    if (body.actionType === "LOG") {
      const { equipmentId, action, performedBy, cost, notes, inkUpdates } = body;

      const log = await prisma.equipmentLog.create({
        data: {
          equipmentId,
          action,
          performedBy: performedBy || "Мастер",
          cost: Number(cost) || 0,
          notes: notes || null,
        },
      });

      // Если переданы новые уровни чернил
      const updateData: any = { lastServiceDate: new Date() };
      if (inkUpdates) {
        if (inkUpdates.cyanLevel !== undefined) updateData.cyanLevel = Number(inkUpdates.cyanLevel);
        if (inkUpdates.magentaLevel !== undefined) updateData.magentaLevel = Number(inkUpdates.magentaLevel);
        if (inkUpdates.yellowLevel !== undefined) updateData.yellowLevel = Number(inkUpdates.yellowLevel);
        if (inkUpdates.blackLevel !== undefined) updateData.blackLevel = Number(inkUpdates.blackLevel);
        
        const allOk = 
          (updateData.cyanLevel ?? 100) > 30 &&
          (updateData.magentaLevel ?? 100) > 30 &&
          (updateData.yellowLevel ?? 100) > 30 &&
          (updateData.blackLevel ?? 100) > 30;
        if (allOk) {
          updateData.status = "OK";
        }
      }

      const updatedEquipment = await prisma.equipment.update({
        where: { id: equipmentId },
        data: updateData,
        include: { logs: { orderBy: { createdAt: "desc" }, take: 10 } },
      });

      return NextResponse.json({ success: true, log, equipment: updatedEquipment });
    }

    // Создание нового станка / оборудования
    const { name, type, assignedToName, notes } = body;
    if (!name || !type) {
      return NextResponse.json(
        { error: "Название и тип обязательны" },
        { status: 400 }
      );
    }

    const newEquipment = await prisma.equipment.create({
      data: {
        name,
        type,
        assignedToName: assignedToName || null,
        notes: notes || null,
        status: "OK",
        cyanLevel: type === "PRINTER" ? 100 : null,
        magentaLevel: type === "PRINTER" ? 100 : null,
        yellowLevel: type === "PRINTER" ? 100 : null,
        blackLevel: type === "PRINTER" ? 100 : null,
      },
      include: { logs: true },
    });

    return NextResponse.json({ success: true, equipment: newEquipment });
  } catch (error) {
    console.error("Failed to process equipment POST:", error);
    return NextResponse.json(
      { error: "Ошибка при сохранении оборудования" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, assignedToName, notes, cyanLevel, magentaLevel, yellowLevel, blackLevel } = body;

    if (!id) {
      return NextResponse.json({ error: "ID обязателен" }, { status: 400 });
    }

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (assignedToName !== undefined) data.assignedToName = assignedToName;
    if (notes !== undefined) data.notes = notes;
    if (cyanLevel !== undefined) data.cyanLevel = Number(cyanLevel);
    if (magentaLevel !== undefined) data.magentaLevel = Number(magentaLevel);
    if (yellowLevel !== undefined) data.yellowLevel = Number(yellowLevel);
    if (blackLevel !== undefined) data.blackLevel = Number(blackLevel);

    const updated = await prisma.equipment.update({
      where: { id },
      data,
      include: { logs: { orderBy: { createdAt: "desc" }, take: 10 } },
    });

    return NextResponse.json({ success: true, equipment: updated });
  } catch (error) {
    console.error("Failed to update equipment:", error);
    return NextResponse.json(
      { error: "Ошибка обновления оборудования" },
      { status: 500 }
    );
  }
}
