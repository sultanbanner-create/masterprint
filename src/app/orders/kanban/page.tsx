import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { KanbanBoard } from "@/components/KanbanBoard";
import { PlusCircle, ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function KanbanPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("mp_auth_session")?.value;
  const currentUser = token ? verifyToken(token) : null;

  const [orders, employees] = await Promise.all([
    prisma.order.findMany({
      include: {
        client: true,
        assignedTo: true,
        items: true,
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
            Канбан-доска производства
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentUser?.role === "DIRECTOR"
              ? "Визуальный конвейер: Заявка ➔ Макет (Жалгас) ➔ Печать (Альберт) ➔ Сборка (Абзал) ➔ Монтаж ➔ Сдан"
              : `Рабочий конвейер цеха • Авторизован: ${currentUser?.name || "Мастер"} (${currentUser?.roleTitle || ""})`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/orders"
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 shadow-2xs transition flex items-center gap-1.5"
          >
            <ClipboardList className="w-4 h-4 text-teal-600" />
            Реестр таблицей
          </Link>
          {currentUser?.role !== "WORKSHOP_PRINTING" && (
            <Link
              href="/orders/new"
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm shadow-teal-600/30 transition flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              + Новый заказ
            </Link>
          )}
        </div>
      </div>

      <KanbanBoard initialOrders={orders} employees={employees} currentUser={currentUser} />
    </div>
  );
}
