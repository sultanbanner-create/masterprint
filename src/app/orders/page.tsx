import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { OrderList } from "@/components/OrderList";
import { PlusCircle, KanbanSquare } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function OrdersPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("mp_auth_session")?.value;
  const currentUser = token ? verifyToken(token) : null;

  const [orders, employees] = await Promise.all([
    prisma.order.findMany({
      include: {
        client: true,
        assignedTo: true,
        items: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Реестр нарядов-заказов
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentUser?.role === "DIRECTOR"
              ? "Полный реестр нарядов, контроль сроков, оплат и ответственных мастеров"
              : `Наряды цеха • Авторизован: ${currentUser?.name || "Мастер"} (${currentUser?.roleTitle || ""})`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/orders/kanban"
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 shadow-2xs transition flex items-center gap-1.5"
          >
            <KanbanSquare className="w-4 h-4 text-blue-600" />
            Канбан цеха
          </Link>
          {currentUser?.role !== "WORKSHOP_PRINTING" && (
            <Link
              href="/orders/new"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/30 transition flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              + Новый наряд
            </Link>
          )}
        </div>
      </div>

      <OrderList
        initialOrders={orders}
        employees={employees}
        currentUser={currentUser}
      />
    </div>
  );
}
