"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  X, 
  ClipboardList, 
  Users, 
  Warehouse, 
  Wrench, 
  ArrowRight, 
  PlusCircle, 
  KanbanSquare, 
  Calendar, 
  Wallet,
  ExternalLink,
  Zap,
  Coins
} from "lucide-react";
import { formatCurrency, STATUS_CONFIG } from "@/lib/utils";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>({ orders: [], clients: [], materials: [], equipment: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults({ orders: [], clients: [], materials: [], equipment: [] });
    }
  }, [isOpen]);

  // Быстрый поиск с debounce
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults({ orders: [], clients: [], materials: [], equipment: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNavigate = (url: string) => {
    onClose();
    router.push(url);
  };

  const hasResults =
    results.orders.length > 0 ||
    results.clients.length > 0 ||
    results.materials.length > 0 ||
    results.equipment.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 pt-16 sm:pt-24 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Поисковая строка */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50/70">
          <Search className="w-5 h-5 text-teal-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Быстрый поиск: ORD-101, клиент, телефон, баннер 510, станок, Лабо..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Результаты поиска */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {loading && (
            <div className="py-6 text-center text-xs text-slate-400">
              Поиск по базе цеха наружной рекламы...
            </div>
          )}

          {!loading && query.length >= 2 && !hasResults && (
            <div className="py-8 text-center text-slate-400 text-xs">
              Ничего не найдено по запросу «{query}»
            </div>
          )}

          {/* Быстрые действия ERP, если строка пустая */}
          {!query && (
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Быстрый переход по разделам:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => handleNavigate("/orders/new")}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100 text-teal-800 text-xs font-bold transition text-left"
                >
                  <PlusCircle className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>+ Новый наряд</span>
                </button>
                <button
                  onClick={() => handleNavigate("/orders/kanban")}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition text-left"
                >
                  <KanbanSquare className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Канбан цеха</span>
                </button>
                <button
                  onClick={() => handleNavigate("/calendar")}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition text-left"
                >
                  <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Календарь</span>
                </button>
                <button
                  onClick={() => handleNavigate("/warehouse")}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition text-left"
                >
                  <Warehouse className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Склад материалов</span>
                </button>
                <button
                  onClick={() => handleNavigate("/finance")}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition text-left"
                >
                  <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Касса & Долги</span>
                </button>
                <button
                  onClick={() => handleNavigate("/settings/pricing")}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition text-left"
                >
                  <Coins className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Тарифы & Цены</span>
                </button>
              </div>
            </div>
          )}

          {/* Наряды */}
          {results.orders.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Заказы наружной рекламы ({results.orders.length})
              </span>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                {results.orders.map((ord: any) => {
                  const statusCfg = STATUS_CONFIG[ord.status] || { label: ord.status, color: "text-slate-700" };
                  return (
                    <button
                      key={ord.id}
                      onClick={() => handleNavigate(`/orders/${ord.id}`)}
                      className="w-full flex items-center justify-between p-3 hover:bg-teal-50/50 transition text-left text-xs group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-100/70 text-teal-800 flex items-center justify-center font-bold text-[11px] font-mono shrink-0">
                          {ord.orderNumber.replace("ORD-", "")}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-teal-700 transition">
                            {ord.orderNumber} • {ord.title}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Клиент: <span className="font-medium text-slate-700">{ord.clientName}</span>
                            {ord.assignedTo && <> • Мастер: <span className="font-medium text-slate-700">{ord.assignedTo}</span></>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-slate-900">{formatCurrency(ord.totalAmount)}</div>
                        <span className={`text-[10px] font-bold ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Клиенты CRM */}
          {results.clients.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Клиенты CRM ({results.clients.length})
              </span>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                {results.clients.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => handleNavigate(`/clients/${c.id}`)}
                    className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition text-left text-xs group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-blue-700 transition">
                          {c.name} {c.company && <span className="text-slate-500 font-normal">({c.company})</span>}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {c.phone || "Телефон не указан"} • Заказов: {c.totalOrders}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {c.debt > 0 ? (
                        <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          Долг: {formatCurrency(c.debt)}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium">Оплачен</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Склад */}
          {results.materials.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Материалы склада ({results.materials.length})
              </span>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                {results.materials.map((m: any) => (
                  <button
                    key={m.id}
                    onClick={() => handleNavigate("/warehouse")}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-amber-50/50 transition text-left text-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Warehouse className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-900">{m.name}</span>
                        <span className="text-[10px] text-slate-400 ml-2">({m.category})</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold ${m.isLow ? "text-red-600" : "text-slate-800"}`}>
                        {m.quantity} {m.unit}
                      </span>
                      {m.isLow && <span className="text-[10px] text-red-600 font-bold block">⚠️ Дефицит</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}


        </div>

        {/* Нижний подсказчик */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Нажмите <b>ESC</b> для выхода</span>
          <span>MASTER PRINT ERP Омни-поиск</span>
        </div>
      </div>
    </div>
  );
}
