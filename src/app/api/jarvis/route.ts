import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const detail = searchParams.get("detail") === "full";

    // 1. Статистика по заказам
    const [orders, clients, materials, employees] = await Promise.all([
      prisma.order.findMany({
        include: {
          client: true,
          assignedTo: true,
          items: true,
          payments: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.client.findMany({
        include: {
          orders: {
            select: {
              totalAmount: true,
              paidAmount: true,
              debtAmount: true,
              status: true,
            },
          },
        },
      }),
      prisma.stockMaterial.findMany(),
      prisma.employee.findMany(),
    ]);

    const activeOrders = orders.filter((o) => o.status !== "COMPLETED");
    const readyOrders = orders.filter((o) => o.status === "READY");
    const printingOrders = orders.filter((o) => o.status === "PRINTING");
    const assemblyOrders = orders.filter((o) => o.status === "ASSEMBLY" || o.status === "MOUNTING");

    // Финансы
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalPaid = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    const totalDebt = orders.reduce((sum, o) => sum + (o.debtAmount || 0), 0);

    // Должники
    const debtors = clients
      .map((c) => {
        const debt = c.orders.reduce((sum, o) => sum + (o.debtAmount || 0), 0);
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          company: c.company,
          debtAmount: debt,
        };
      })
      .filter((c) => c.debtAmount > 0)
      .sort((a, b) => b.debtAmount - a.debtAmount)
      .slice(0, 10);

    // Загрузка мастеров
    const mastersLoad = {
      albert: {
        name: "Альберт",
        role: "Мастер & Печатник (Широкоформатная печать)",
        activeTasks: orders.filter(
          (o) =>
            o.status !== "COMPLETED" &&
            (o.assignedTo?.name === "Альберт" ||
              o.status === "PRINTING" ||
              o.items?.some((i) => i.serviceType === "BANNER" || i.serviceType === "ORACAL"))
        ).length,
      },
      abzal: {
        name: "Абзал",
        role: "Мастер сборки & Монтаж (Короба, Буквы, Стенды)",
        activeTasks: orders.filter(
          (o) =>
            o.status !== "COMPLETED" &&
            (o.assignedTo?.name === "Абзал" ||
              ["ASSEMBLY", "MOUNTING"].includes(o.status) ||
              o.items?.some((i) => ["LIGHTBOX", "LETTERS", "STAND", "INSTALL"].includes(i.serviceType)))
        ).length,
      },
      zhalgas: {
        name: "Жалгас",
        role: "Менеджер & Дизайнер",
        activeTasks: orders.filter(
          (o) => o.status === "NEW" || o.status === "DESIGN" || o.assignedTo?.name === "Жалгас"
        ).length,
      },
      timur: {
        name: "Тимур",
        role: "Директор",
        allOrders: orders.length,
      },
    };

    // Формирование сжатого и удобного для ИИ списка последних заказов
    const recentOrders = orders.slice(0, 25).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      title: o.title,
      client: {
        name: o.client?.name,
        phone: o.client?.phone,
        company: o.client?.company,
      },
      status: o.status,
      priority: o.priority,
      master: o.assignedTo?.name || "Не назначен",
      totalAmount: o.totalAmount,
      paidAmount: o.paidAmount,
      debtAmount: o.debtAmount,
      completedBy: o.completedBy,
      completedAt: o.completedAt,
      deadline: o.deadline,
      items: o.items.map((it) => ({
        serviceType: it.serviceType,
        title: it.title,
        width: it.width,
        height: it.height,
        area: it.area,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
        options: it.options,
      })),
    }));

    return NextResponse.json({
      ok: true,
      service: "Master Print ERP Jarvis API",
      timestamp: new Date().toISOString(),
      summary: {
        totalOrders: orders.length,
        activeOrders: activeOrders.length,
        readyOrders: readyOrders.length,
        printingOrders: printingOrders.length,
        assemblyOrders: assemblyOrders.length,
        totalClients: clients.length,
      },
      finance: {
        totalRevenueUZS: totalRevenue,
        totalPaidUZS: totalPaid,
        totalDebtUZS: totalDebt,
        activeDebtorsCount: debtors.length,
      },
      masters: mastersLoad,
      topDebtors: debtors,
      materialsLowStock: materials.filter((m) => m.quantity <= (m.minThreshold || 10)).map((m) => ({
        name: m.name,
        category: m.category,
        quantity: m.quantity,
        unit: m.unit,
      })),
      recentOrders,
      availableApiEndpoints: {
        summary: "/api/jarvis",
        orders: "/api/orders",
        clients: "/api/clients",
        stock: "/api/stock",
        finance: "/api/payments",
        payroll: "/api/payroll",
      },
    });
  } catch (error: any) {
    console.error("Jarvis API error:", error);
    return NextResponse.json({ ok: false, error: error.message || "Failed to fetch data for Jarvis" }, { status: 500 });
  }
}
