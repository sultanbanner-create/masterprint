"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Banknote, CreditCard, Building, XCircle } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export function PendingPaymentsList({
  initialPayments,
  isDirector,
}: {
  initialPayments: any[];
  isDirector: boolean;
}) {
  const router = useRouter();
  const [payments, setPayments] = useState(initialPayments);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleConfirm = async (paymentId: string, amount: number) => {
    if (!isDirector) {
      alert("Только Администратор / Руководитель (Тимур) может подтверждать платежи в кассу");
      return;
    }

    if (!confirm(`Подтвердить прием оплаты на сумму ${formatCurrency(amount)} и списать долг?`)) {
      return;
    }

    setLoadingId(paymentId);
    try {
      const res = await fetch(`/api/finance/payments/${paymentId}/confirm`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка подтверждения");

      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      router.refresh();
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (paymentId: string, amount: number) => {
    if (!isDirector) return;
    if (!confirm(`Отклонить и удалить ошибочную запись оплаты на сумму ${formatCurrency(amount)}?`)) {
      return;
    }

    setLoadingId(paymentId);
    try {
      const res = await fetch(`/api/finance/payments/${paymentId}/confirm`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка отклонения");

      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      router.refresh();
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  if (payments.length === 0) return null;

  return (
    <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          <h3 className="text-sm font-black text-amber-950 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            Ожидают подтверждения Админа в кассу ({payments.length})
          </h3>
        </div>
        <span className="text-xs font-mono font-bold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-lg">
          Двухэтапная защита от ошибок
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {payments.map((p) => (
          <div
            key={p.id}
            className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs space-y-2.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-blue-600">
                  {p.order?.orderNumber || "Наряд"}
                </span>
                <span className="text-[11px] text-slate-400">
                  {formatDateTime(p.createdAt)}
                </span>
              </div>

              <div className="font-bold text-sm text-slate-800 mt-1">
                {p.order?.client?.name || "Клиент"}
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  {p.method === "CASH" ? (
                    <Banknote className="w-3.5 h-3.5 text-blue-600" />
                  ) : p.method === "CARD" ? (
                    <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                  ) : (
                    <Building className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  {p.method === "CASH" ? "Наличные" : p.method === "CARD" ? "Карта" : "Безнал"}
                </span>
                <span className="text-base font-black font-mono text-emerald-700">
                  {formatCurrency(p.amount)}
                </span>
              </div>

              {p.notes && (
                <p className="text-[11px] text-slate-500 italic mt-1 truncate">
                  {p.notes.replace("[NUKUS_BOXES]", "").trim()}
                </p>
              )}
            </div>

            {isDirector ? (
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleConfirm(p.id, p.amount)}
                  disabled={loadingId === p.id}
                  className="py-2 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs shadow-emerald-600/20 transition flex items-center justify-center gap-1 active:scale-98 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{loadingId === p.id ? "..." : "Подтвердить"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(p.id, p.amount)}
                  disabled={loadingId === p.id}
                  className="py-2 px-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition flex items-center justify-center gap-1 active:scale-98 disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Отклонить</span>
                </button>
              </div>
            ) : (
              <div className="py-1.5 px-2 rounded-lg bg-slate-100 text-slate-500 text-[11px] text-center font-medium">
                Ожидает подтверждения Админом
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
