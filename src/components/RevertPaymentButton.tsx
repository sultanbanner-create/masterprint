"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

export function RevertPaymentButton({
  paymentId,
  amount,
  isConfirmed,
}: {
  paymentId: string;
  amount: number;
  isConfirmed: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRevert = async () => {
    const msg = isConfirmed
      ? `Отменить эту подтвержденную оплату на сумму ${formatCurrency(amount)}? Сумма вернется обратно в долг клиента!`
      : `Отклонить и удалить неподтвержденный платеж на сумму ${formatCurrency(amount)}?`;

    if (!confirm(msg)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/finance/payments/${paymentId}/confirm`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка отмены");
      router.refresh();
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRevert}
      disabled={loading}
      className="mt-1 px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold transition disabled:opacity-50"
      title="Отменить ошибочную оплату и вернуть сумму в долг клиента"
    >
      {loading ? "Отмена..." : "↩️ Отменить оплату"}
    </button>
  );
}
