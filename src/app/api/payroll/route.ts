import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// Тарифы сдельной оплаты мастеров наружной рекламы
const PIECE_RATES = {
  BANNER_PER_M2: 3000,      // Альберту: 3 000 сум за м² печати
  ORACAL_PER_M2: 4000,      // Альберту/Жалгасу: 4 000 сум за м² плоттера/печати
  LETTER_PER_CM: 1200,      // Абзалу: 1 200 сум за 1 см высоты буквы
  INSTALL_SHARE: 0.30,      // Абзалу: 30% от чека монтажа
  SALES_COMMISSION: 0.05,   // Жалгасу: 5% от суммы заказа
  DESIGN_PER_FILE: 50000,   // Жалгасу: 50 000 сум за дизайн-макет
};

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("mp_auth_session")?.value;
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser || currentUser.role !== "DIRECTOR") {
      return NextResponse.json({ error: "Доступ к зарплатной ведомости разрешен только руководителю" }, { status: 403 });
    }

    const employees = await prisma.employee.findMany({
      include: {
        payouts: { orderBy: { createdAt: "desc" } },
        orders: {
          include: {
            items: true,
          },
        },
      },
    });

    // Рассчитываем сдельную выработку каждого мастера
    const stats = employees.map((emp) => {
      let totalEarned = 0;
      const earningsDetails: any[] = [];

      emp.orders.forEach((order) => {
        // Для мастеров цеха сдельная оплата начисляется за выполненные наряды (READY, COMPLETED или с отметкой completedBy)
        const isCompletedWork =
          order.status === "READY" ||
          order.status === "COMPLETED" ||
          Boolean(order.completedBy);

        if ((emp.role === "WORKSHOP_PRINTING" || emp.role === "WORKSHOP_ASSEMBLY" || emp.name === "Альберт" || emp.name === "Абзал") && !isCompletedWork) {
          return;
        }

        let orderEarnings = 0;

        order.items.forEach((item) => {
          let itemLabor = 0;
          const qty = Math.max(1, item.quantity || 1);

          if (emp.name === "Альберт" || emp.role === "WORKSHOP_PRINTING") {
            // Печатник: за кв.м баннера и оракала с учетом тиража
            if (item.serviceType === "BANNER" && item.area) {
              itemLabor += item.area * qty * PIECE_RATES.BANNER_PER_M2;
            } else if (item.serviceType === "ORACAL" && item.area) {
              itemLabor += item.area * qty * PIECE_RATES.ORACAL_PER_M2;
            }
          } else if (emp.name === "Абзал" || emp.role === "WORKSHOP_ASSEMBLY") {
            // Сборщик и монтажник: за буквы и монтаж с учетом тиража
            if (item.serviceType === "LETTERS" && item.letterCount && item.letterHeight) {
              itemLabor += item.letterCount * item.letterHeight * qty * PIECE_RATES.LETTER_PER_CM;
            } else if (item.serviceType === "LIGHTBOX") {
              itemLabor += item.totalPrice * 0.20; // 20% от лайтбокса
            } else if (item.serviceType === "INSTALL") {
              itemLabor += item.totalPrice * PIECE_RATES.INSTALL_SHARE;
            }
          } else if (emp.name === "Жалгас" || emp.role === "SALES_DESIGNER") {
            // Продажи и дизайн: % от чека + за дизайн
            if (item.serviceType === "CUSTOM" && item.title.toLowerCase().includes("дизайн")) {
              itemLabor += PIECE_RATES.DESIGN_PER_FILE * qty;
            }
            // 5% от чека заказа
            itemLabor += item.totalPrice * PIECE_RATES.SALES_COMMISSION;
          }

          if (itemLabor > 0) {
            orderEarnings += itemLabor;
            earningsDetails.push({
              orderId: order.id,
              orderNumber: order.orderNumber,
              itemTitle: item.title,
              amount: itemLabor,
              createdAt: order.createdAt,
            });
          }
        });

        totalEarned += orderEarnings;
      });

      // Сумма выплаченных денег (авансы, ЗП)
      const totalPaidOut = emp.payouts.reduce((sum, p) => sum + p.amount, 0);
      const balanceDue = totalEarned - totalPaidOut;

      return {
        employee: {
          id: emp.id,
          name: emp.name,
          roleTitle: emp.roleTitle,
          phone: emp.phone,
        },
        totalEarned,
        totalPaidOut,
        balanceDue,
        payouts: emp.payouts,
        earningsDetails,
      };
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to calculate payroll:", error);
    return NextResponse.json({ error: "Failed to calculate payroll" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("mp_auth_session")?.value;
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser || currentUser.role !== "DIRECTOR") {
      return NextResponse.json({ error: "Только руководитель может регистрировать выплаты зарплаты" }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, amount, type, orderId, description } = body;

    if (!employeeId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Сотрудник и сумма обязательны" }, { status: 400 });
    }

    const payout = await prisma.salaryPayout.create({
      data: {
        employeeId,
        amount: parseFloat(amount),
        type: type || "PIECE_RATE",
        orderId: orderId ? parseInt(orderId) : null,
        description: description || "Выплата зарплаты / аванс",
      },
    });

    return NextResponse.json(payout, { status: 201 });
  } catch (error) {
    console.error("Failed to record payout:", error);
    return NextResponse.json({ error: "Failed to record payout" }, { status: 500 });
  }
}
