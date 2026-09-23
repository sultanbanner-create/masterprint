import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { formatCurrency, formatDate, formatDateTime, getDeadlineInfo, STATUS_CONFIG } from "@/lib/utils";
import { DailyShiftPlanner } from "@/components/DailyShiftPlanner";
import { DashboardActiveOrders } from "@/components/DashboardActiveOrders";
import { 
  PlusCircle, 
  ClipboardList, 
  KanbanSquare, 
  Clock, 
  Flame, 
  AlertCircle, 
  TrendingUp, 
  User, 
  Layers, 
  ArrowRight, 
  Printer, 
  Sparkles, 
  Hammer,
  Banknote,
  Warehouse,
  Send,
  PieChart,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Award
} from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function DashboardPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("mp_auth_session")?.value;
  const currentUser = token ? verifyToken(token) : null;
  const isDirector = currentUser?.role === "DIRECTOR";

  const [orders, employees, clientsCount, materials, movements] = await Promise.all([
    prisma.order.findMany({
      include: { client: true, assignedTo: true, items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany(),
    prisma.client.count(),
    prisma.stockMaterial.findMany(),
    prisma.stockMovement.findMany({
      where: { type: "DEDUCTION" },
      include: { material: true },
    }),
  ]);

  // Расчет персональной выработки сотрудника (с учетом специфики цеха)
  const isAlbert = currentUser?.role === "WORKSHOP_PRINTING" || currentUser?.name === "Альберт";
  const isAbzal = currentUser?.role === "WORKSHOP_ASSEMBLY" || currentUser?.name === "Абзал";

  const myOrders = orders.filter((o) => {
    if (o.assignedToId === currentUser?.id || o.assignedTo?.name === currentUser?.name) return true;
    if (isAlbert && (o.status === "PRINTING" || o.items?.some((i) => i.serviceType === "BANNER" || i.serviceType === "ORACAL"))) return true;
    if (isAbzal && (["ASSEMBLY", "MOUNTING"].includes(o.status) || o.items?.some((i) => ["LETTERS", "LIGHTBOX", "STAND", "INSTALL"].includes(i.serviceType)))) return true;
    return false;
  });
  const myCompletedOrders = myOrders.filter(
    (o) => o.status === "COMPLETED" || o.status === "READY"
  );
  const myCompletedSum = myCompletedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const myActiveOrders = myOrders.filter((o) => o.status !== "COMPLETED");
  const myUrgentOrders = myActiveOrders.filter((o) => {
    if (o.priority === "URGENT") return true;
    if (!o.deadline) return false;
    const diffHours = (new Date(o.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
    return diffHours <= 24;
  });

  // Общие показатели цеха
  const activeOrders = orders.filter((o) => o.status !== "COMPLETED");
  const totalRevenue = orders.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalDebts = orders.reduce((sum, o) => sum + o.debtAmount, 0);

  const urgentOrders = activeOrders.filter((o) => {
    if (o.priority === "URGENT") return true;
    if (!o.deadline) return false;
    const diffHours = (new Date(o.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
    return diffHours <= 24;
  });

  // Анализ выручки по категориям (только для директора)
  const categoryRevenue: Record<string, number> = {
    BANNER: 0,
    LETTERS: 0,
    LIGHTBOX: 0,
    ORACAL: 0,
    AUTO_BRANDING: 0,
    INSTALL: 0,
    CUSTOM: 0,
  };

  orders.forEach((o) => {
    o.items?.forEach((item) => {
      const cat = item.serviceType || "CUSTOM";
      categoryRevenue[cat] = (categoryRevenue[cat] || 0) + item.totalPrice;
    });
  });

  const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
    LETTERS: { label: "Объемные буквы LED", icon: "💡", color: "bg-orange-500" },
    BANNER: { label: "Печать баннеров 3.2м", icon: "🖨️", color: "bg-purple-500" },
    LIGHTBOX: { label: "Лайтбоксы / Короба", icon: "📦", color: "bg-blue-500" },
    ORACAL: { label: "Пленка Oracal & Накатка", icon: "🎨", color: "bg-teal-500" },
    AUTO_BRANDING: { label: "Оклейка авто (Damas/Labo)", icon: "🚐", color: "bg-amber-500" },
    INSTALL: { label: "Монтажные работы", icon: "🛠️", color: "bg-cyan-500" },
    CUSTOM: { label: "Дизайн и прочее", icon: "✨", color: "bg-slate-500" },
  };

  const totalMaterialCostDeducted = movements.reduce(
    (sum, m) => sum + m.quantity * (m.material?.costPerUnit || 0),
    0
  );

  let totalLaborAccrued = 0;
  orders.forEach((o) => {
    o.items?.forEach((item) => {
      if (item.serviceType === "BANNER" && item.area) {
        totalLaborAccrued += item.area * 3000;
      } else if (item.serviceType === "LETTERS" && item.letterCount && item.letterHeight) {
        totalLaborAccrued += item.letterCount * item.letterHeight * 1200;
      } else if (item.serviceType === "INSTALL") {
        totalLaborAccrued += item.totalPrice * 0.30;
      }
      totalLaborAccrued += item.totalPrice * 0.05;
    });
  });

  const estimatedNetProfit = Math.max(0, totalRevenue - totalMaterialCostDeducted - totalLaborAccrued);
  const profitMarginPercent = totalRevenue > 0 ? Math.round((estimatedNetProfit / totalRevenue) * 100) : 0;
  const lowStockMaterials = materials.filter((m) => m.quantity <= m.minThreshold);

  // =========================================================================
  // РЕЖИМ СОТРУДНИКА (Жалгас, Абзал, Альберт): ТОЛЬКО ЗАКАЗЫ И СУММА ВЫРАБОТКИ
  // =========================================================================
  if (!isDirector) {
    return (
      <div className="space-y-6">
        {/* Шапка сотрудника */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Рабочее место: {currentUser?.name || "Сотрудник"}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                {currentUser?.roleTitle || "Мастер цеха"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Учет ваших личных нарядов и суммарного объема выполненных работ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/orders/kanban"
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 shadow-2xs"
            >
              <KanbanSquare className="w-4 h-4 text-blue-600" />
              Канбан цеха
            </Link>
            {currentUser?.role === "SALES_DESIGNER" && (
              <Link
                href="/orders/new"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs shadow-blue-600/30 transition flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                + Новый наряд
              </Link>
            )}
          </div>
        </div>

        {/* 4 Карточки сотрудника: Сумма выполненной работы и наряды */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Сумма выполненной работы */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-200 bg-emerald-50/20 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1">
                <Award className="w-4 h-4 text-emerald-600" /> Выполнено мной
              </span>
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-2 font-mono">
              {formatCurrency(myCompletedSum)}
            </div>
            <div className="text-xs text-emerald-800/80 mt-1 font-semibold">
              Сдано / готово: <b>{myCompletedOrders.length} нарядов</b>
            </div>
          </div>

          {/* 2. Моих нарядов в работе */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                В работе у меня
              </span>
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Layers className="w-5 h-5" />
              </span>
            </div>
            <div className="text-3xl font-black text-blue-700 mt-2 font-mono">
              {myActiveOrders.length}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Всего закреплено: <b>{myOrders.length} нарядов</b>
            </div>
          </div>

          {/* 3. Горящие дедлайны по моим заказам */}
          <div
            className={`bg-white rounded-2xl p-5 border shadow-xs ${
              myUrgentOrders.length > 0 ? "border-amber-300 bg-amber-50/20" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-amber-800 tracking-wider flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Срочные (24ч)
              </span>
              <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <Clock className="w-5 h-5" />
              </span>
            </div>
            <div className="text-3xl font-black text-amber-800 mt-2 font-mono">
              {myUrgentOrders.length}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {myUrgentOrders.length > 0 ? "Срочные наряды мастера" : "Все задачи по графику"}
            </div>
          </div>

          {/* 4. Заказов всего цеха */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                Всего в цехе
              </span>
              <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
                <ClipboardList className="w-5 h-5" />
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
              {activeOrders.length}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Общая очередь</span>
              <Link href="/orders/kanban" className="text-blue-600 font-bold hover:underline">
                Канбан &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Автоматически обновляемый список нарядов в цехе (с табами и галочкой выполнения) */}
        <DashboardActiveOrders initialOrders={orders} currentUser={currentUser} />
      </div>
    );
  }

  // =========================================================================
  // РЕЖИМ ДИРЕКТОРА (Тимур): ПОЛНЫЙ ФИНАНСОВЫЙ ОТЧЕТ, ВЫРУЧКА, КАССА И МАРЖА
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Шапка руководителя */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Производственный дашборд «Master Print»
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
              Кабинет Директора (Тимур)
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Полный контроль кассы, дебиторской задолженности, маржинальности цеха и загрузки мастеров
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/finance"
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200"
          >
            <Banknote className="w-4 h-4 text-blue-600" />
            Касса & Финансы
          </Link>
          <Link
            href="/payroll"
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200"
          >
            <Banknote className="w-4 h-4 text-emerald-600" />
            Зарплаты
          </Link>
          <Link
            href="/warehouse"
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200"
          >
            <Warehouse className="w-4 h-4 text-teal-600" />
            Склад
          </Link>
          <Link
            href="/orders/new"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs shadow-blue-600/30 transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            + Новый наряд
          </Link>
        </div>
      </div>

      {/* 4 Карточки ключевых показателей */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Заказов в работе */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              В производстве
            </span>
            <span className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <Layers className="w-5 h-5" />
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
            {activeOrders.length}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Всего заказов: <b>{orders.length}</b></span>
            <Link href="/orders" className="text-teal-600 font-bold hover:underline">
              Все наряды &rarr;
            </Link>
          </div>
        </div>

        {/* 2. Горящие дедлайны */}
        <div className={`bg-white rounded-2xl p-5 border shadow-xs ${urgentOrders.length > 0 ? "border-amber-300 bg-amber-50/20" : "border-slate-200"}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-amber-800 tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Горят сроки (24ч)
            </span>
            <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <div className="text-3xl font-black text-amber-800 mt-2 font-mono">
            {urgentOrders.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {urgentOrders.length > 0 ? "Требуют первоочередного внимания" : "Все наряды идут по графику"}
          </div>
        </div>

        {/* 3. Оплачено / Выручка */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              Оплачено в кассу
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2 font-mono">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Касса агентства</span>
            <Link href="/finance" className="text-emerald-700 font-bold hover:underline">
              В кассу &rarr;
            </Link>
          </div>
        </div>

        {/* 4. Долги клиентов */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              Долги клиентов
            </span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertCircle className="w-5 h-5" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-800 mt-2 font-mono">
            {formatCurrency(totalDebts)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Дебиторка</span>
            <Link href="/finance" className="text-amber-700 font-bold hover:underline">
              Должники &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Финансовый блок директора: Чистая прибыль и Рентабельность */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-6 rounded-3xl shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
                Финансовый отчет руководителя
              </span>
              <span className="text-xs text-slate-400">Доступно только Тимуру</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Экономика цеха «Master Print»
            </h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Фактическая выручка, списанная себестоимость рулонов/акрила и чистый финансовый результат
            </p>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                Списано материалов:
              </span>
              <span className="text-lg font-black font-mono text-rose-300 block mt-0.5">
                ~{formatCurrency(totalMaterialCostDeducted)}
              </span>
            </div>

            <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                Фонд мастеров:
              </span>
              <span className="text-lg font-black font-mono text-orange-300 block mt-0.5">
                ~{formatCurrency(totalLaborAccrued)}
              </span>
            </div>

            <div className="p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/30">
              <span className="text-[10px] text-emerald-300 font-semibold uppercase block">
                Расчетная чистая прибыль:
              </span>
              <span className="text-xl font-black font-mono text-emerald-400 block mt-0.5">
                +{formatCurrency(estimatedNetProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Планировщик смен мастеров */}
      <DailyShiftPlanner employees={employees} orders={orders} />
    </div>
  );
}
