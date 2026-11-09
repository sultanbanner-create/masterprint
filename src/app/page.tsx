import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { formatCurrency, getDeadlineInfo, plural, STATUS_CONFIG } from "@/lib/utils";
import { DailyShiftPlanner } from "@/components/DailyShiftPlanner";
import { DashboardActiveOrders } from "@/components/DashboardActiveOrders";
import { ProductionPipeline } from "@/components/ProductionPipeline";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const TZ = "Asia/Tashkent";

function greetingFor(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("ru-RU", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(now));
  if (hour < 5) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

function dateLabel(now: Date): string {
  const s = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(now);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isUrgent(o: { priority: string | null; deadline: Date | null }): boolean {
  if (o.priority === "URGENT") return true;
  if (!o.deadline) return false;
  return (new Date(o.deadline).getTime() - Date.now()) / 3_600_000 <= 24;
}

export default async function DashboardPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("mp_auth_session")?.value;
  const currentUser = token ? verifyToken(token) : null;
  const isDirector = currentUser?.role === "DIRECTOR";

  const [orders, employees, materials, movements] = await Promise.all([
    prisma.order.findMany({
      include: { client: true, assignedTo: true, items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany(),
    prisma.stockMaterial.findMany(),
    prisma.stockMovement.findMany({
      where: { type: "DEDUCTION" },
      include: { material: true },
    }),
  ]);

  // Тяжёлые base64-картинки в список не передаём — страница грузится быстрее
  const sanitizedOrders = orders.map(({ previewUrl, ...o }) => o);

  const now = new Date();
  const firstName = currentUser?.name || "коллега";

  // Конвейер: сколько нарядов на каждом этапе и сколько из них горят
  const activeOrders = orders.filter((o) => o.status !== "COMPLETED");
  const urgentOrders = activeOrders.filter((o) => o.status !== "READY" && isUrgent(o));
  const stageCounts: Record<string, number> = {};
  const stageUrgent: Record<string, number> = {};
  for (const o of activeOrders) {
    stageCounts[o.status] = (stageCounts[o.status] || 0) + 1;
    if (o.status !== "READY" && isUrgent(o)) stageUrgent[o.status] = (stageUrgent[o.status] || 0) + 1;
  }

  // Личная выработка сотрудника
  const isAlbert = currentUser?.role === "WORKSHOP_PRINTING" || currentUser?.name === "Альберт";
  const isAbzal = currentUser?.role === "WORKSHOP_ASSEMBLY" || currentUser?.name === "Абзал";
  const myOrders = orders.filter((o) => {
    if (o.assignedToId === currentUser?.id || o.assignedTo?.name === currentUser?.name) return true;
    if (isAlbert && (o.status === "PRINTING" || o.items?.some((i) => i.serviceType === "BANNER" || i.serviceType === "ORACAL"))) return true;
    if (isAbzal && (["ASSEMBLY", "MOUNTING"].includes(o.status) || o.items?.some((i) => ["LETTERS", "LIGHTBOX", "STAND", "INSTALL"].includes(i.serviceType)))) return true;
    return false;
  });
  const myDone = myOrders.filter((o) => o.status === "COMPLETED" || o.status === "READY");
  const myDoneSum = myDone.reduce((sum, o) => sum + o.totalAmount, 0);
  const myActive = myOrders.filter((o) => o.status !== "COMPLETED");
  const myUrgent = myActive.filter((o) => o.status !== "READY" && isUrgent(o));

  // Короткая фраза о том, что сейчас в цехе
  const summary = isDirector
    ? urgentOrders.length > 0
      ? `${urgentOrders.length} ${plural(urgentOrders.length, "наряд горит", "наряда горят", "нарядов горят")} по срокам. Всего в работе ${activeOrders.length}.`
      : `Сроки в порядке. В работе ${activeOrders.length} ${plural(activeOrders.length, "наряд", "наряда", "нарядов")}.`
    : myActive.length > 0
      ? `У вас ${myActive.length} ${plural(myActive.length, "наряд", "наряда", "нарядов")} в работе${myUrgent.length ? `, срочных ${myUrgent.length}` : ""}.`
      : "Ваших нарядов в работе нет. Общая очередь цеха ниже.";

  // Деньги (только директору)
  const totalPaid = orders.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalDebts = orders.reduce((sum, o) => sum + o.debtAmount, 0);
  const debtOrdersCount = orders.filter((o) => o.debtAmount > 0).length;
  const materialCost = movements.reduce((sum, m) => sum + m.quantity * (m.material?.costPerUnit || 0), 0);

  let laborCost = 0;
  orders.forEach((o) => {
    o.items?.forEach((item) => {
      if (item.serviceType === "BANNER" && item.area) laborCost += item.area * 3000;
      else if (item.serviceType === "LETTERS" && item.letterCount && item.letterHeight) laborCost += item.letterCount * item.letterHeight * 1200;
      else if (item.serviceType === "STAND" && item.area) laborCost += item.area * 40000;
      else if (item.serviceType === "INSTALL") laborCost += item.totalPrice * 0.3;
      laborCost += item.totalPrice * 0.05;
    });
  });
  const netProfit = Math.max(0, totalPaid - materialCost - laborCost);

  const hotList = [...urgentOrders]
    .sort((a, b) => (a.deadline ? new Date(a.deadline).getTime() : Infinity) - (b.deadline ? new Date(b.deadline).getTime() : Infinity))
    .slice(0, 5);
  const lowStock = materials
    .filter((m) => m.quantity <= m.minThreshold)
    .sort((a, b) => a.quantity / (a.minThreshold || 1) - b.quantity / (b.minThreshold || 1))
    .slice(0, 5);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Смена: приветствие и конвейер цеха */}
      <section className="rounded-2xl bg-ink text-white overflow-hidden">
        <div className="cmyk-strip" />
        <div className="p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-slate-400">{dateLabel(now)}</p>
              <h2 className="mt-1 text-[26px] sm:text-[32px] leading-tight font-extrabold tracking-tight text-balance">
                {greetingFor(now)}, {firstName}
              </h2>
              <p className="mt-2 text-[15px] text-slate-300 max-w-xl">{summary}</p>
              {!isDirector && myDone.length > 0 && (
                <p className="mt-1 text-sm text-slate-400">
                  Сделано и сдано: {myDone.length} {plural(myDone.length, "наряд", "наряда", "нарядов")} на{" "}
                  <span className="text-emerald-300 font-bold">{formatCurrency(myDoneSum)}</span>
                </p>
              )}
            </div>
            <Link
              href="/orders/kanban"
              className="inline-flex items-center gap-1 text-sm font-bold text-brand-300 hover:text-white shrink-0"
            >
              Открыть канбан <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-6">
            <ProductionPipeline counts={stageCounts} urgent={stageUrgent} />
          </div>
        </div>
      </section>

      {isDirector && (
        <>
          {/* Деньги */}
          <section className="bg-white rounded-2xl border border-slate-200 grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <Link href="/finance" className="block p-5 hover:bg-slate-50/70 transition-colors rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none">
              <div className="text-sm text-slate-500">Оплачено клиентами</div>
              <div className="mt-1 text-[24px] lg:text-[28px] font-extrabold tracking-tight text-slate-900">{formatCurrency(totalPaid)}</div>
              <div className="mt-1 text-xs text-slate-500">за всё время, по всем нарядам</div>
            </Link>
            <Link href="/finance" className="block p-5 hover:bg-slate-50/70 transition-colors">
              <div className="text-sm text-slate-500">Долги клиентов</div>
              <div className={`mt-1 text-[24px] lg:text-[28px] font-extrabold tracking-tight ${totalDebts > 0 ? "text-red-600" : "text-slate-900"}`}>
                {formatCurrency(totalDebts)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {debtOrdersCount > 0
                  ? `${debtOrdersCount} ${plural(debtOrdersCount, "наряд оплачен", "наряда оплачены", "нарядов оплачены")} не полностью`
                  : "все наряды оплачены"}
              </div>
            </Link>
            <div className="p-5">
              <div className="text-sm text-slate-500">Прибыль, оценка</div>
              <div className="mt-1 text-[24px] lg:text-[28px] font-extrabold tracking-tight text-emerald-700">{formatCurrency(netProfit)}</div>
              <div className="mt-1 text-xs text-slate-500">
                после материалов ({formatCurrency(materialCost)}) и работы мастеров ({formatCurrency(laborCost)})
              </div>
            </div>
          </section>

          {/* Что требует внимания */}
          <div className="grid lg:grid-cols-2 gap-5">
            <section className="bg-white rounded-2xl border border-slate-200">
              <header className="flex items-center justify-between px-5 pt-4 pb-3">
                <h3 className="font-bold text-slate-900">Горит по срокам</h3>
                <Link href="/orders" className="text-sm font-semibold text-brand-600 hover:text-brand-800">Все заказы</Link>
              </header>
              {hotList.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-slate-500">Сроки под контролем. Наряды с дедлайном меньше суток появятся здесь.</p>
              ) : (
                <ul className="divide-y divide-slate-100 border-t border-slate-100">
                  {hotList.map((o) => {
                    const d = getDeadlineInfo(o.deadline);
                    const cfg = STATUS_CONFIG[o.status];
                    return (
                      <li key={o.id}>
                        <Link href={`/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${cfg?.dot || "bg-slate-400"}`} title={cfg?.label} />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-slate-900 truncate">{o.title}</div>
                            <div className="text-xs text-slate-500 truncate">
                              {o.orderNumber}, {o.client?.name || "без клиента"}
                            </div>
                          </div>
                          <span className={`text-xs font-bold shrink-0 ${d.isOverdue ? "text-red-600" : "text-amber-700"}`}>
                            {o.deadline ? d.label : "Срочный"}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="bg-white rounded-2xl border border-slate-200">
              <header className="flex items-center justify-between px-5 pt-4 pb-3">
                <h3 className="font-bold text-slate-900">Заканчивается на складе</h3>
                <Link href="/warehouse" className="text-sm font-semibold text-brand-600 hover:text-brand-800">Склад</Link>
              </header>
              {lowStock.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-slate-500">Всех материалов хватает. Позиции ниже минимального остатка появятся здесь.</p>
              ) : (
                <ul className="divide-y divide-slate-100 border-t border-slate-100">
                  {lowStock.map((m) => {
                    const ratio = Math.max(0, Math.min(1, m.quantity / (m.minThreshold || 1)));
                    return (
                      <li key={m.id} className="px-5 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-semibold text-slate-900 truncate">{m.name}</span>
                          <span className="text-xs text-slate-500 shrink-0">
                            <b className={m.quantity <= 0 ? "text-red-600" : "text-slate-900"}>
                              {m.quantity} {m.unit}
                            </b>{" "}
                            из {m.minThreshold}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${ratio < 0.34 ? "bg-red-500" : "bg-amber-400"}`}
                            style={{ width: `${Math.max(4, ratio * 100)}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      {/* Живой список нарядов цеха с отметкой «готово» */}
      <DashboardActiveOrders initialOrders={sanitizedOrders} currentUser={currentUser} />

      {isDirector && <DailyShiftPlanner employees={employees} orders={sanitizedOrders} />}
    </div>
  );
}
