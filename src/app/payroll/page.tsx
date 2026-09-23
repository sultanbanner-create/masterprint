"use client";

import React, { useState, useEffect } from "react";
import { 
  Banknote, 
  UserCheck, 
  TrendingUp, 
  Clock, 
  Plus, 
  Calendar, 
  CheckCircle, 
  Printer,
  Hammer,
  Palette,
  Crown,
  ChevronRight
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

interface EmployeePayroll {
  employee: {
    id: string;
    name: string;
    roleTitle: string;
    phone: string | null;
  };
  totalEarned: number;
  totalPaidOut: number;
  balanceDue: number;
  payouts: any[];
  earningsDetails: any[];
}

export default function PayrollPage() {
  const [payrollData, setPayrollData] = useState<EmployeePayroll[]>([]);
  const [loading, setLoading] = useState(true);

  // Модалка выплаты
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [payoutAmount, setPayoutAmount] = useState<string>("");
  const [payoutType, setPayoutType] = useState<"PIECE_RATE" | "ADVANCE" | "BONUS" | "SALARY">("PIECE_RATE");
  const [payoutNotes, setPayoutNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const loadPayroll = async () => {
    try {
      const res = await fetch("/api/payroll");
      if (res.ok) {
        const data = await res.json();
        setPayrollData(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayroll();
  }, []);

  const handleRecordPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !payoutAmount || Number(payoutAmount) <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          amount: parseFloat(payoutAmount),
          type: payoutType,
          description: payoutNotes.trim() || null,
        }),
      });

      if (res.ok) {
        setPayoutAmount("");
        setPayoutNotes("");
        setIsPayoutModalOpen(false);
        await loadPayroll();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleIcon = (name: string) => {
    switch (name) {
      case "Альберт":
        return <Printer className="w-5 h-5 text-purple-600" />;
      case "Абзал":
        return <Hammer className="w-5 h-5 text-orange-600" />;
      case "Жалгас":
        return <Palette className="w-5 h-5 text-blue-600" />;
      default:
        return <Crown className="w-5 h-5 text-teal-600" />;
    }
  };

  const totalFundAccrued = payrollData.reduce((sum, p) => sum + p.totalEarned, 0);
  const totalFundPaid = payrollData.reduce((sum, p) => sum + p.totalPaidOut, 0);
  const totalFundDue = payrollData.reduce((sum, p) => sum + p.balanceDue, 0);

  return (
    <div className="space-y-6">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Banknote className="w-7 h-7 text-teal-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Сдельная зарплата & Выработка мастеров
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Автоматический расчёт ставок мастеров за м² печати баннеров, буквы LED, монтажи и продажи
          </p>
        </div>

        <button
          onClick={() => {
            if (payrollData.length > 0) {
              setSelectedEmployeeId(payrollData[0].employee.id);
            }
            setIsPayoutModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Выдать выплату / аванс мастеру
        </button>
      </div>

      {/* Метрики зарплатного фонда */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Начислено по заказам</div>
            <div className="text-xl font-black text-slate-900 font-mono">
              {formatCurrency(totalFundAccrued)}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Фактически выплачено</div>
            <div className="text-xl font-black text-emerald-700 font-mono">
              {formatCurrency(totalFundPaid)}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            totalFundDue > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-600"
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Остаток к выдаче на руки</div>
            <div className={`text-xl font-black font-mono ${totalFundDue > 0 ? "text-amber-600" : "text-slate-700"}`}>
              {formatCurrency(totalFundDue)}
            </div>
          </div>
        </div>
      </div>

      {/* Карточки мастеров */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-slate-400 text-xs">Расчёт выработки сотрудников...</div>
        ) : (
          payrollData.map((record) => {
            const isDue = record.balanceDue > 0;
            return (
              <div
                key={record.employee.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 shadow-inner">
                        {getRoleIcon(record.employee.name)}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{record.employee.name}</h3>
                        <p className="text-xs text-slate-500">{record.employee.roleTitle}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Остаток к выдаче:</span>
                      <span className={`text-base font-black font-mono ${isDue ? "text-amber-600" : "text-emerald-700"}`}>
                        {formatCurrency(record.balanceDue)}
                      </span>
                    </div>
                  </div>

                  {/* Статистика выработки */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Сдельно заработал:</span>
                      <span className="text-sm font-bold font-mono text-slate-800">
                        {formatCurrency(record.totalEarned)}
                      </span>
                    </div>

                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                      <span className="text-emerald-700 block text-[10px] uppercase font-bold">Уже выплачено:</span>
                      <span className="text-sm font-bold font-mono text-emerald-800">
                        {formatCurrency(record.totalPaidOut)}
                      </span>
                    </div>
                  </div>

                  {/* Правила сделки */}
                  <div className="text-[11px] bg-slate-50 p-2.5 rounded-xl text-slate-600 space-y-1">
                    <span className="font-bold text-slate-700 block text-[10px] uppercase">Тариф сдельной ставки:</span>
                    {record.employee.name === "Альберт" && (
                      <p>🖨️ <b>3 000 сум / м²</b> за печать баннеров и оракала</p>
                    )}
                    {record.employee.name === "Абзал" && (
                      <p>🔨 <b>1 200 сум / см</b> за сборку световых букв LED + <b>30%</b> от чека за монтаж</p>
                    )}
                    {record.employee.name === "Жалгас" && (
                      <p>🎨 <b>5%</b> от чека за продажу + <b>50 000 сум</b> за макет в CorelDRAW</p>
                    )}
                    {record.employee.name === "Тимур" && (
                      <p>👑 Директор: контроль кассы и чистая прибыль производства</p>
                    )}
                  </div>

                  {/* Выполненные наряды */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Начисления по нарядам ({record.earningsDetails.length}):
                    </span>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {record.earningsDetails.length > 0 ? (
                        record.earningsDetails.map((item, i) => (
                          <div
                            key={i}
                            className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-slate-800 font-mono text-[11px] mr-1.5">
                                {item.orderNumber}:
                              </span>
                              <span className="text-slate-600">{item.itemTitle}</span>
                            </div>
                            <span className="font-bold font-mono text-teal-700 text-xs shrink-0 ml-2">
                              +{formatCurrency(item.amount)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 italic py-2">Наряды пока не назначены</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Подвал с кнопкой выдачи */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Выплат в журнале: {record.payouts.length}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedEmployeeId(record.employee.id);
                      if (record.balanceDue > 0) {
                        setPayoutAmount(String(record.balanceDue));
                      }
                      setIsPayoutModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-teal-400" />
                    Выдать деньги
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Журнал всех выплат */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/75">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            История выплат мастерам
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/40">
                <th className="py-2.5 px-4">Дата</th>
                <th className="py-2.5 px-4">Мастер</th>
                <th className="py-2.5 px-4">Тип выплаты</th>
                <th className="py-2.5 px-4">Примечание</th>
                <th className="py-2.5 px-4 text-right">Сумма выплаты</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrollData.flatMap((p) =>
                p.payouts.map((item) => ({ ...item, employeeName: p.employee.name }))
              ).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    Выплат еще не производилось.
                  </td>
                </tr>
              ) : (
                payrollData
                  .flatMap((p) =>
                    p.payouts.map((item) => ({ ...item, employeeName: p.employee.name }))
                  )
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((payout) => (
                    <tr key={payout.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-4 font-mono text-slate-500">
                        {formatDateTime(payout.createdAt)}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {payout.employeeName}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 uppercase border border-slate-200">
                          {payout.type === "PIECE_RATE"
                            ? "Сдельная ЗП"
                            : payout.type === "ADVANCE"
                            ? "Аванс"
                            : payout.type === "BONUS"
                            ? "Премия"
                            : "Оклад"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {payout.description || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                        -{formatCurrency(payout.amount)}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модалка выплаты */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
            <h3 className="font-bold text-base text-slate-900">
              Выдать деньги мастеру
            </h3>

            <form onSubmit={handleRecordPayout} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Сотрудник / Мастер
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
                >
                  {payrollData.map((p) => (
                    <option key={p.employee.id} value={p.employee.id}>
                      {p.employee.name} ({p.employee.roleTitle.split("&")[0]}) — Долг: {formatCurrency(p.balanceDue)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Сумма выплаты (UZS)
                </label>
                <input
                  type="number"
                  required
                  placeholder="500000"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full px-3 py-2 font-mono font-bold text-base bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Тип начисления
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { type: "PIECE_RATE", label: "Сдельная" },
                    { type: "ADVANCE", label: "Аванс" },
                    { type: "BONUS", label: "Премия" },
                  ].map((btn) => (
                    <button
                      key={btn.type}
                      type="button"
                      onClick={() => setPayoutType(btn.type as any)}
                      className={`p-2 rounded-lg font-bold border transition ${
                        payoutType === btn.type
                          ? "bg-teal-600 text-white border-teal-600"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Примечание
                </label>
                <input
                  type="text"
                  placeholder="Выплата за заказы недели"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs disabled:opacity-50"
                >
                  {submitting ? "Проводка..." : "Провести выплату"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
