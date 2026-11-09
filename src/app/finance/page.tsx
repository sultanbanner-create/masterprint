import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { formatCurrency, formatDate, formatDateTime, plural } from "@/lib/utils";
import { Wallet, CreditCard, Banknote, Building, AlertCircle, ShieldCheck, Package, ArrowRight } from "lucide-react";
import { PendingPaymentsList } from "@/components/PendingPaymentsList";
import { RevertPaymentButton } from "@/components/RevertPaymentButton";

export const revalidate = 0;

export default async function FinancePage() {
  const cookieStore = cookies();
  const token = cookieStore.get("mp_auth_session")?.value;
  const currentUser = token ? verifyToken(token) : null;
  const isDirector = currentUser?.role === "DIRECTOR";

  const [payments, debtorOrders, ulugbek] = await Promise.all([
    prisma.payment.findMany({
      include: {
        order: {
          include: { client: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.order.findMany({
      where: { debtAmount: { gt: 0 } },
      include: { client: true, assignedTo: true },
      orderBy: { debtAmount: "desc" },
    }),
    prisma.client.findFirst({
      where: {
        OR: [
          { name: "Улугбек" },
          { company: { contains: "Нукус гуллери" } },
        ],
      },
      include: {
        orders: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  const ulugbekDebt = ulugbek?.orders.reduce((sum, o) => sum + o.debtAmount, 0) || 0;
  const ulugbekTotalOrdered = ulugbek?.orders.reduce((sum, o) => sum + o.totalAmount, 0) || 0;
  const ulugbekTotalBoxes = ulugbek?.orders.reduce(
    (sum, o) => sum + o.items.reduce((iSum, it) => iSum + it.quantity, 0),
    0
  ) || 0;
  const ulugbekUnpaidOrdersCount = ulugbek?.orders.filter((o) => o.debtAmount > 0).length || 0;

  const pendingPayments = payments.filter((p) => p.status === "PENDING_CONFIRMATION");
  const confirmedPayments = payments.filter((p) => p.status !== "PENDING_CONFIRMATION");

  let cashTotal = 0;
  let cardTotal = 0;
  let transferTotal = 0;

  confirmedPayments.forEach((p) => {
    if (p.method === "CASH") cashTotal += p.amount;
    else if (p.method === "CARD") cardTotal += p.amount;
    else if (p.method === "TRANSFER") transferTotal += p.amount;
  });

  const totalDebts = debtorOrders.reduce((sum, o) => sum + o.debtAmount, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Касса и долги</h2>
          <p className="text-sm text-slate-500 mt-1">
            Жалгас принимает оплату от клиента, директор подтверждает её в кассу.
          </p>
        </div>
      </div>

      {/* Оплаты, ожидающие подтверждения директором (Жалгас принял) */}
      <PendingPaymentsList
        initialPayments={pendingPayments}
        isDirector={isDirector}
      />

      {/* Касса: только подтверждённые деньги */}
      <section className="bg-white rounded-2xl border border-slate-200 grid grid-cols-2 lg:grid-cols-4 divide-slate-200 [&>*]:border-slate-200">
        <div className="p-4 sm:p-5 border-b lg:border-b-0 border-r">
          <div className="flex items-center gap-2 text-sm text-slate-500"><Banknote className="w-4 h-4" /> Наличные</div>
          <div className="mt-1 text-xl sm:text-[22px] font-extrabold text-slate-900">{formatCurrency(cashTotal)}</div>
        </div>
        <div className="p-4 sm:p-5 border-b lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 text-sm text-slate-500"><CreditCard className="w-4 h-4" /> Карта и Click</div>
          <div className="mt-1 text-xl sm:text-[22px] font-extrabold text-slate-900">{formatCurrency(cardTotal)}</div>
        </div>
        <div className="p-4 sm:p-5 border-r">
          <div className="flex items-center gap-2 text-sm text-slate-500"><Building className="w-4 h-4" /> Расчётный счёт</div>
          <div className="mt-1 text-xl sm:text-[22px] font-extrabold text-slate-900">{formatCurrency(transferTotal)}</div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500"><AlertCircle className="w-4 h-4" /> Долги клиентов</div>
          <div className={`mt-1 text-xl sm:text-[22px] font-extrabold ${totalDebts > 0 ? "text-red-600" : "text-slate-900"}`}>
            {formatCurrency(totalDebts)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {debtorOrders.length} {plural(debtorOrders.length, "наряд", "наряда", "нарядов")} с долгом
          </div>
        </div>
      </section>

      {/* Спецсчёт: Улугбек («Нукус гуллери») — Суммированный баланс за коробки цеха */}
      <div className="bg-ink rounded-2xl p-4 sm:p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30 flex items-center gap-1">
              <Package className="w-3 h-3 text-emerald-400" />
              Линия коробок: Нукус гуллери
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Мастер Абзал</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <span>Улугбек («Нукус гуллери»)</span>
            <span className="text-xs text-slate-400 font-normal">{ulugbek?.phone || "+998 90 735-00-11"}</span>
          </div>
          <p className="text-xs text-slate-300">
            Всего изготовлено: <strong className="text-white">{ulugbekTotalBoxes} шт.</strong> ({ulugbek?.orders?.length || 0} партий) • Сумма заказов: <strong className="text-emerald-300">{formatCurrency(ulugbekTotalOrdered)}</strong>
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-3 sm:p-4 rounded-xl backdrop-blur-xs justify-between md:justify-end">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block tracking-wider">
              Текущий долг Улугбека:
            </span>
            <span className={`text-xl sm:text-2xl font-black ${ulugbekDebt > 0 ? "text-red-400" : "text-emerald-400"}`}>
              {formatCurrency(ulugbekDebt)}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {ulugbekUnpaidOrdersCount > 0 ? `${ulugbekUnpaidOrdersCount} неоплаченных партий` : "Все партии оплачены"}
            </span>
          </div>

          <Link
            href="/production/nukus-boxes"
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shrink-0 shadow-md shadow-emerald-500/20"
          >
            <span>К коробкам & Оплате</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2 Колонки: Должники и История поступлений */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Реестр должников */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Реестр дебиторской задолженности
              </h2>
              <span className="text-[10px] text-slate-400">Наряды с неоплаченным остатком</span>
            </div>
            <span className="text-xs font-bold text-amber-800">
              {debtorOrders.length} клиентов
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {debtorOrders.map((o) => (
              <div
                key={o.id}
                className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/orders/${o.id}`}
                      className="font-mono font-bold text-blue-600 hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                    <span className="font-bold text-slate-900">{o.client?.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {o.client?.company || o.client?.phone || "Без названия"}
                  </div>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div>
                    <span className="font-mono font-black text-red-600 text-sm block">
                      {formatCurrency(o.debtAmount)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      из {formatCurrency(o.totalAmount)}
                    </span>
                  </div>

                  <Link
                    href={`/orders/${o.id}`}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-semibold text-[11px] transition"
                  >
                    Погасить
                  </Link>
                </div>
              </div>
            ))}

            {debtorOrders.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Все заказы полностью оплачены! Долгов нет.
              </div>
            )}
          </div>
        </div>

        {/* Журнал всех платежей */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-blue-600" />
                Журнал входящих платежей
              </h2>
              <span className="text-[10px] text-slate-400">История оплат и статусы кассы</span>
            </div>
            <span className="text-xs font-bold text-slate-600">
              {payments.length} записей
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {payments.map((p) => (
              <div
                key={p.id}
                className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {p.order?.client?.name || "Клиент"}
                    </span>
                    {p.order && (
                      <Link
                        href={`/orders/${p.order.id}`}
                        className="font-mono text-[11px] text-blue-600 hover:underline"
                      >
                        {p.order.orderNumber}
                      </Link>
                    )}
                    {p.status === "PENDING_CONFIRMATION" ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Ожидает кассы
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Принято: {p.acceptedBy || "Тимур"}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {p.method === "CASH" ? "Наличные" : p.method === "CARD" ? "Click / Карта" : "Безнал"}
                    {p.receivedBy ? ` • Получил: ${p.receivedBy}` : ""}
                    {p.notes ? ` • ${p.notes.replace("[NUKUS_BOXES]", "").replace(/\s*\[ALLOC:[^\]]*\]/g, "").trim()}` : ""}
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <span className="font-mono font-black text-emerald-700 text-sm block">
                    +{formatCurrency(p.amount)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {formatDateTime(p.createdAt)}
                  </span>
                  {isDirector && (
                    <RevertPaymentButton
                      paymentId={p.id}
                      amount={p.amount}
                      isConfirmed={p.status === "CONFIRMED"}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
