"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  Users, 
  Phone, 
  Building2, 
  MessageSquare, 
  PlusCircle, 
  Wallet, 
  ArrowUpRight, 
  Calendar, 
  FileText, 
  Clock, 
  AlertTriangle,
  ExternalLink,
  Edit2,
  Check,
  X
} from "lucide-react";
import { formatCurrency, formatDateTime, STATUS_CONFIG } from "@/lib/utils";

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadClient = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${params.id}`);
      if (!res.ok) throw new Error("Клиент не найден");
      const data = await res.json();
      setClient(data);
      setEditName(data.name || "");
      setEditPhone(data.phone || "");
      setEditCompany(data.company || "");
      setEditNotes(data.notes || "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClient();
  }, [params.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(`/api/clients/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim() || null,
          company: editCompany.trim() || null,
          notes: editNotes.trim() || null,
        }),
      });
      if (res.ok) {
        setIsEditing(false);
        await loadClient();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Загрузка карточки клиента...</div>;
  }

  if (!client) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-slate-500 font-bold">Клиент не найден</p>
        <Link href="/clients" className="text-xs text-teal-600 font-bold hover:underline">
          &larr; Вернуться в CRM
        </Link>
      </div>
    );
  }

  const cleanPhone = client.phone ? client.phone.replace(/[^0-9]/g, "") : "";
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : "";
  const tgUrl = cleanPhone ? `https://t.me/+${cleanPhone}` : "";

  return (
    <div className="space-y-6">
      {/* Верхняя строка навигации */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/clients"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {client.name}
              </h1>
              {client.company && (
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                  {client.company}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Клиент CRM • Зарегистрирован {formatDateTime(client.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Edit2 className="w-4 h-4 text-slate-500" />
            {isEditing ? "Отмена" : "Редактировать"}
          </button>

          <Link
            href="/orders/new"
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm shadow-teal-600/30 transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            + Новый наряд
          </Link>
        </div>
      </div>

      {/* Форма редактирования */}
      {isEditing && (
        <form onSubmit={handleSave} className="bg-white p-5 rounded-2xl border border-teal-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Редактирование данных клиента</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">ФИО / Контактное лицо</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Номер телефона</label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Компания / Заведение</label>
              <input
                type="text"
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Технические примечания цеху</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-bold bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </div>
        </form>
      )}

      {/* 4 Карточки статистики LTV клиента */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Всего заказов</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{client.totalOrders || 0}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">В истории цеха</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Общий оборот (LTV)</div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{formatCurrency(client.totalSpent || 0)}</div>
          <div className="text-[11px] text-teal-600 font-semibold mt-0.5">Средний чек: {formatCurrency(client.averageCheck || 0)}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Оплачено в кассу</div>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">{formatCurrency(client.paidAmount || 0)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Фактические поступления</div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-xs ${client.debtAmount > 0 ? "bg-red-50/60 border-red-200" : "bg-white border-slate-200"}`}>
          <div className="text-[11px] font-bold uppercase text-slate-400">Остаток долга</div>
          <div className={`text-2xl font-black mt-1 font-mono ${client.debtAmount > 0 ? "text-red-600" : "text-emerald-700"}`}>
            {formatCurrency(client.debtAmount || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {client.debtAmount > 0 ? "⚠️ Требует расчета" : "✓ Долгов нет"}
          </div>
        </div>
      </div>

      {/* Контакты и связь */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs text-slate-400 font-bold uppercase">Быстрая связь с заказчиком</div>
          <div className="flex items-center gap-3 font-mono text-sm font-bold text-slate-900">
            {client.phone ? (
              <>
                <Phone className="w-4 h-4 text-teal-600" />
                <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
              </>
            ) : (
              <span className="text-slate-400 font-normal">Телефон не указан</span>
            )}
          </div>
          {client.notes && (
            <p className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 inline-block mt-2">
              📝 {client.notes}
            </p>
          )}
        </div>

        {cleanPhone && (
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </a>
            <a
              href={tgUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              Telegram
            </a>
          </div>
        )}
      </div>

      {/* История всех заказов клиента */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" />
            История нарядов наружной рекламы ({client.orders?.length || 0})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                <th className="py-3 px-4">№ Наряда</th>
                <th className="py-3 px-4">Наименование вывески</th>
                <th className="py-3 px-4">Мастер цеха</th>
                <th className="py-3 px-4">Статус</th>
                <th className="py-3 px-4 text-right">Сумма</th>
                <th className="py-3 px-4 text-right">Остаток долга</th>
                <th className="py-3 px-4 text-center">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {client.orders && client.orders.length > 0 ? (
                client.orders.map((ord: any) => {
                  const statusCfg = STATUS_CONFIG[ord.status] || {
                    label: ord.status,
                    color: "text-slate-800",
                    bg: "bg-slate-100",
                    border: "border-slate-300",
                  };
                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <Link href={`/orders/${ord.id}`} className="hover:text-teal-600 hover:underline">
                          {ord.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div>{ord.title}</div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          {formatDateTime(ord.createdAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {ord.assignedTo?.name || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(ord.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {ord.debtAmount > 0 ? (
                          <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            {formatCurrency(ord.debtAmount)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">Оплачен</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/orders/${ord.id}`}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-700 text-xs font-semibold transition"
                          >
                            Наряд
                          </Link>
                          <Link
                            href={`/track/${ord.id}`}
                            target="_blank"
                            className="p-1 rounded-lg text-purple-600 hover:bg-purple-50 transition"
                            title="Онлайн-трекер для клиента"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    У клиента пока нет оформленных нарядов
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
