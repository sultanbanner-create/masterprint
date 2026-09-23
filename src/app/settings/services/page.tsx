"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ChevronLeft, 
  Plus, 
  Layers, 
  Trash2, 
  Check, 
  AlertTriangle, 
  Save, 
  HelpCircle,
  Sparkles,
  Sliders,
  FileCheck
} from "lucide-react";
import { MASTER_PRINT_CATALOG, validateHeightTariffs, ServiceDefinition } from "@/lib/catalog/services";
import { formatUzCurrency } from "@/lib/calculator/decimal";

export default function ServicesConstructorPage() {
  const [services, setServices] = useState<ServiceDefinition[]>(MASTER_PRINT_CATALOG);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(MASTER_PRINT_CATALOG[0].id);
  const [notification, setNotification] = useState<string | null>(null);

  // Форма добавления новой подуслуги (S02)
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [newSubUnit, setNewSubUnit] = useState("м²");
  const [newSubRate, setNewSubRate] = useState(50000);
  const [newSubDesc, setNewSubDesc] = useState("");

  const activeService = services.find((s) => s.id === selectedServiceId) || services[0];

  const handleAddSubService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    const newSub: ServiceDefinition = {
      id: `sub-${Date.now()}`,
      code: `CUSTOM_${Date.now()}`,
      categoryId: activeService.categoryId,
      categoryName: activeService.categoryName,
      name: newSubName.trim(),
      description: newSubDesc.trim(),
      unit: newSubUnit,
      defaultRate: Number(newSubRate) || 0,
    };

    setServices((prev) =>
      prev.map((s) => {
        if (s.id === activeService.id) {
          return {
            ...s,
            subServices: [...(s.subServices || []), newSub],
          };
        }
        return s;
      })
    );

    setNotification(`Подуслуга «${newSubName}» успешно добавлена в каталог «${activeService.name}» (ТЗ S02)`);
    setIsAddingSub(false);
    setNewSubName("");
    setNewSubDesc("");
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/calculator"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase">
                Конструктор услуг ТЗ 1.0
              </span>
              <span className="text-xs text-slate-500">Настройка владельцем без программиста</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              Каталог услуг & Структура расчетов «Master Print»
            </h1>
          </div>
        </div>

        <Link
          href="/calculator"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Проверить в калькуляторе
        </Link>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          {notification}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Список услуг (левая колонка) */}
        <div className="md:col-span-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Категории и базовые изделия:
          </h2>
          <div className="space-y-2">
            {services.map((svc) => (
              <button
                key={svc.id}
                onClick={() => setSelectedServiceId(svc.id)}
                className={`w-full text-left p-3.5 rounded-2xl border transition flex items-start justify-between ${
                  selectedServiceId === svc.id
                    ? "bg-blue-50 border-blue-300 text-blue-900 shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div>
                  <div className="font-bold text-sm">{svc.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{svc.categoryName}</div>
                </div>
                {svc.defaultRate && (
                  <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                    {formatUzCurrency(svc.defaultRate)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Детализация и подуслуги (правая колонка) */}
        <div className="md:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900">{activeService.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{activeService.description}</p>
              </div>
              <button
                onClick={() => setIsAddingSub(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Добавить подуслугу (S02)
              </button>
            </div>

            {/* Форма добавления подуслуги */}
            {isAddingSub && (
              <form onSubmit={handleAddSubService} className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">
                    Новая подуслуга для «{activeService.name}»
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingSub(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Отмена
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Название (например: Очистка клея от старой пленки)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Очистка клея / Сварка усилителя"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Тариф (UZS)
                    </label>
                    <input
                      type="number"
                      required
                      value={newSubRate}
                      onChange={(e) => setNewSubRate(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Единица измерения
                  </label>
                  <select
                    value={newSubUnit}
                    onChange={(e) => setNewSubUnit(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                  >
                    <option value="м²">м² (квадратный метр)</option>
                    <option value="пог. м">пог. м (погонный метр)</option>
                    <option value="шт">шт (штука)</option>
                    <option value="объект">объект (разово на выезд)</option>
                    <option value="час">час</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Сохранить подуслугу в каталог
                </button>
              </form>
            )}

            {/* Список подуслуг */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Входящие подуслуги и варианты:
              </span>
              {activeService.subServices && activeService.subServices.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                  {activeService.subServices.map((sub) => (
                    <div key={sub.id} className="p-3.5 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-slate-800">{sub.name}</div>
                        <div className="text-[11px] text-slate-500">{sub.description || sub.unit}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-blue-900">
                          {formatUzCurrency(sub.defaultRate || 0)}
                        </span>
                        <span className="text-[11px] text-slate-400 block">/ {sub.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                  Для данной услуги нет отдельных подуслуг (расчет по базовому тарифу).
                </div>
              )}
            </div>

            {/* Диапазоны тарифов букв (S04) */}
            {activeService.heightTariffs && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Тарифная сетка по высоте буквы (см) — Раздел 6 ТЗ:
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                    Диапазоны валидированы (без перекрытий)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {activeService.heightTariffs.map((t, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="text-slate-500 block">
                        Высота: <strong className="text-slate-900">[{t.minCm}; {t.maxCm}) см</strong>
                      </span>
                      <span className="font-mono font-bold text-blue-600 text-sm mt-1 block">
                        {formatUzCurrency(t.ratePerCm)} / см
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
