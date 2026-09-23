"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Phone, Building2, Plus, Search, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");

  const loadClients = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          company: company.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (res.ok) {
        setName("");
        setPhone("");
        setCompany("");
        setNotes("");
        setIsModalOpen(false);
        await loadClients();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredClients = clients.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Клиентская база (CRM)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Контрагенты, организации, контактные лица и баланс расчётов
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm shadow-teal-600/30 transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          + Добавить клиента
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Поиск по имени, телефону или названию заведения..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs bg-transparent focus:outline-none text-slate-900"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                <th className="py-3 px-6">Заказчик</th>
                <th className="py-3 px-4">Телефон</th>
                <th className="py-3 px-4">Компания / Объект</th>
                <th className="py-3 px-4 text-center">Заказов</th>
                <th className="py-3 px-4 text-right">Общая сумма</th>
                <th className="py-3 px-4 text-right">Текущий долг</th>
                <th className="py-3 px-6 text-center">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-6 font-bold text-slate-900">
                    <Link href={`/clients/${client.id}`} className="hover:text-teal-600 hover:underline">
                      {client.name}
                    </Link>
                    {client.notes && <div className="text-[11px] text-slate-400 font-normal">{client.notes}</div>}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">
                    {client.phone ? (
                      <div className="space-y-1">
                        <a href={`tel:${client.phone}`} className="hover:text-teal-600 hover:underline font-bold block">
                          {client.phone}
                        </a>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <a
                            href={`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:underline font-semibold flex items-center gap-0.5"
                          >
                            WhatsApp
                          </a>
                          <span className="text-slate-300">•</span>
                          <a
                            href={`https://t.me/+${client.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline font-semibold flex items-center gap-0.5"
                          >
                            Telegram
                          </a>
                        </div>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {client.company || "—"}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                    {client.totalOrders || 0}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(client.totalSpent)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    {client.debt > 0 ? (
                      <div className="space-y-1">
                        <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200 inline-block">
                          {formatCurrency(client.debt)}
                        </span>
                        {client.phone && (
                          <a
                            href={`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                              `Здравствуйте, ${client.name}! Напоминаем об остатке оплаты ${formatCurrency(
                                client.debt
                              )} по заказу наружной рекламы в OUTDOOR PRODUCTION. Пожалуйста, сообщите, когда будет удобно закрыть наряд. Спасибо!`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[10px] text-amber-700 font-bold hover:underline"
                            title="Отправить вежливое напоминание о долге в WhatsApp"
                          >
                            Напомнить в WA &rarr;
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-emerald-700 font-medium">Нет долга</span>
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Link
                        href={`/clients/${client.id}`}
                        className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-800 text-xs font-semibold transition"
                      >
                        Профиль
                      </Link>
                      <Link
                        href={`/orders?query=${encodeURIComponent(client.name)}`}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                      >
                        Наряды
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredClients.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Клиенты не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="font-bold text-base text-slate-900">
              Новый клиент в базе
            </h3>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Имя заказчика *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Сардор"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Номер телефона
                </label>
                <input
                  type="text"
                  placeholder="+998 90 000 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-teal-600 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Организация / Магазин
                </label>
                <input
                  type="text"
                  placeholder="Магазин / Кафе / Школа"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Заметки
                </label>
                <input
                  type="text"
                  placeholder="Особенности клиента"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
