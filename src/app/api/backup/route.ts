import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const downloadRaw = url.searchParams.get("raw") === "true";

    // Если запрошен сырой файл dev.db
    if (downloadRaw) {
      const dbPath = path.join(process.cwd(), "prisma", "dev.db");
      if (!fs.existsSync(dbPath)) {
        return NextResponse.json({ error: "Файл базы данных не найден" }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(dbPath);
      return new Response(fileBuffer, {
        headers: {
          "Content-Type": "application/x-sqlite3",
          "Content-Disposition": `attachment; filename="masterprint_database_${new Date().toISOString().split("T")[0]}.db"`,
        },
      });
    }

    // Экспорт в формате JSON
    const [
      orders,
      clients,
      employees,
      payments,
      stockMaterials,
      stockMovements,
      equipment,
      equipmentLogs,
      telegramSetting,
    ] = await Promise.all([
      prisma.order.findMany({ include: { items: true, comments: true } }),
      prisma.client.findMany(),
      prisma.employee.findMany(),
      prisma.payment.findMany(),
      prisma.stockMaterial.findMany(),
      prisma.stockMovement.findMany(),
      prisma.equipment.findMany({ include: { logs: true } }),
      prisma.equipmentLog.findMany(),
      prisma.telegramSetting.findMany(),
    ]);

    const backupData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      appName: "Master Print ERP",
      data: {
        orders,
        clients,
        employees,
        payments,
        stockMaterials,
        stockMovements,
        equipment,
        equipmentLogs,
        telegramSetting,
      },
      summary: {
        totalOrders: orders.length,
        totalClients: clients.length,
        totalPayments: payments.length,
        totalMaterials: stockMaterials.length,
        totalEquipment: equipment.length,
      },
    };

    return new Response(JSON.stringify(backupData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="masterprint_backup_${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error: any) {
    console.error("Backup error:", error);
    return NextResponse.json(
      { error: "Ошибка создания резервной копии" },
      { status: 500 }
    );
  }
}
