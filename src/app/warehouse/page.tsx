"use client";

import React, { useState, useEffect } from "react";
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Search, 
  Filter, 
  Layers, 
  CheckCircle2,
  Trash2,
  Edit2,
  TrendingDown,
  Warehouse,
  ShoppingCart
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { SupplierOrderModal } from "@/components/SupplierOrderModal";

interface StockMaterial {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  costPerUnit: number;
  updatedAt: string;
}

const CATEGORY_NAMES: Record<string, string> = {
  ALL: "Все материалы",
  BANNER: "Баннеры (рулоны)",
  VINYL: "Пленки Oracal",
  SHEET: "Листовые (Акрил/ПВХ)",
  LED: "Светодиоды & Блоки питания",
  HARDWARE: "Фурнитура, профили, клей",
  OTHER: "Прочее",
};

export default function WarehousePage() {
  const [materials, setMaterials] = useState<StockMaterial[]>([]);
  const [summary, setSummary] = useState({ totalItems: 0, lowStockCount: 0, totalStockValue: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Модалка добавления / изменения
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "BANNER",
    quantity: "",
    unit: "м²",
    minThreshold: "10",
    costPerUnit: "",
  });

  const loadStock = async () => {
    try {
      const res = await fetch("/api/stock");
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials || []);
        setSummary(data.summary || { totalItems: 0, lowStockCount: 0, totalStockValue: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, []);

  const handleAdjustQuantity = async (id: string, delta: number) => {
    try {
      const res = await fetch("/api/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, delta }),
      });
      if (res.ok) {
        loadStock();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await fetch("/api/stock", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            exactQuantity: parseFloat(formData.quantity) || 0,
            costPerUnit: parseFloat(formData.costPerUnit) || 0,
            minThreshold: parseFloat(formData.minThreshold) || 10,
          }),
        });
      } else {
        await fetch("/api/stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        name: "",
        category: "BANNER",
        quantity: "",
        unit: "м²",
        minThreshold: "10",
        costPerUnit: "",
      });
      loadStock();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить этот материал из каталога склада?")) return;
    try {
      const res = await fetch(`/api/stock?id=${id}`, { method: "DELETE" });
      if (res.ok) loadStock();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesCategory = selectedCategory === "ALL" || m.category === selectedCategory;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Шапка склада */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Warehouse className="w-7 h-7 text-teal-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Склад и остатки материалов</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Учет баннерных рулонов, акрила, диодов и расходных материалов наружной рекламы
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSupplierModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
            title="Сформировать список закупки дефицитных материалов и отправить поставщику"
          >
            <ShoppingCart className="w-4 h-4" />
            Заявка поставщику (Дефицит)
          </button>

          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: "",
                category: "BANNER",
                quantity: "",
                unit: "м²",
                minThreshold: "10",
                costPerUnit: "",
              });
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Добавить позицию
          </button>
        </div>
      </div>

      {/* Метрики склада */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Всего позиций в цеху</div>
            <div className="text-xl font-black text-slate-900">{summary.totalItems} шт.</div>
          </div>
        </div>

        <div
          onClick={() => setIsSupplierModalOpen(true)}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:border-amber-400 transition group"
          title="Нажмите, чтобы открыть заявку поставщику"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              summary.lowStockCount > 0 ? "bg-red-50 text-red-600 group-hover:scale-105" : "bg-emerald-50 text-emerald-600"
            } transition`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase">Заканчивается (требует заказа)</div>
              <div className={`text-xl font-black ${summary.lowStockCount > 0 ? "text-red-600" : "text-emerald-700"}`}>
                {summary.lowStockCount} поз.
              </div>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-700 underline group-hover:text-amber-800">
            Заказать &rarr;
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Общая стоимость запасов</div>
            <div className="text-xl font-black text-slate-900 font-mono">
              {formatCurrency(summary.totalStockValue)}
            </div>
          </div>
        </div>
      </div>

      {/* Фильтры по категориям и поиск */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                selectedCategory === key
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Поиск по складу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
          />
        </div>
      </div>

      {/* Таблица материалов */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs">Загрузка материалов склада...</div>
        ) : filteredMaterials.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">Материалы не найдены.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Наименование</th>
                  <th className="py-3 px-4">Категория</th>
                  <th className="py-3 px-4 text-center">Остаток на складе</th>
                  <th className="py-3 px-4 text-center">Мин. норма</th>
                  <th className="py-3 px-4 text-right">Себестоимость</th>
                  <th className="py-3 px-4 text-right">Быстрое списание / приход</th>
                  <th className="py-3 px-4 text-center">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.map((mat) => {
                  const isLow = mat.quantity <= mat.minThreshold;
                  return (
                    <tr key={mat.id} className={`hover:bg-slate-50/80 transition ${isLow ? "bg-red-50/20" : ""}`}>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{mat.name}</div>
                        {isLow && (
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-red-600 mt-0.5">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            Остаток ниже нормы! Пора заказать у поставщика.
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 uppercase border border-slate-200">
                          {CATEGORY_NAMES[mat.category] || mat.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-xl font-mono font-bold text-sm border ${
                          isLow 
                            ? "bg-red-100 text-red-700 border-red-200 animate-pulse" 
                            : "bg-teal-50 text-teal-800 border-teal-200"
                        }`}>
                          {mat.quantity} {mat.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {mat.minThreshold} {mat.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                        {formatCurrency(mat.costPerUnit)} / {mat.unit}
                      </td>
                      <td className="py-3 px-4">
                        {/* Кнопки быстрого расхода/прихода */}
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Списать 1 ед."
                            onClick={() => handleAdjustQuantity(mat.id, -1)}
                            className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Списать 5 ед."
                            onClick={() => handleAdjustQuantity(mat.id, -5)}
                            className="px-1.5 py-0.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-[10px] font-mono text-slate-600 font-bold transition"
                          >
                            -5
                          </button>
                          <button
                            title="Оприходовать 5 ед."
                            onClick={() => handleAdjustQuantity(mat.id, 5)}
                            className="px-1.5 py-0.5 rounded-lg border border-emerald-200 hover:bg-emerald-50 text-[10px] font-mono text-emerald-700 font-bold transition"
                          >
                            +5
                          </button>
                          <button
                            title="Оприходовать 1 ед."
                            onClick={() => handleAdjustQuantity(mat.id, 1)}
                            className="p-1 rounded-lg border border-emerald-200 hover:bg-emerald-50 text-emerald-700 transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingId(mat.id);
                              setFormData({
                                name: mat.name,
                                category: mat.category,
                                quantity: String(mat.quantity),
                                unit: mat.unit,
                                minThreshold: String(mat.minThreshold),
                                costPerUnit: String(mat.costPerUnit),
                              });
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                            title="Редактировать"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(mat.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модалка Добавления / Редактирования */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="font-bold text-base text-slate-900">
              {editingId ? "Редактировать материал склада" : "Новый материал на склад"}
            </h3>

            <form onSubmit={handleSaveMaterial} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Наименование материала
                </label>
                <input
                  type="text"
                  required
                  placeholder="Баннер литой 510г (рулон 3.2м)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Категория
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="BANNER">Баннеры (рулоны)</option>
                    <option value="VINYL">Пленки Oracal</option>
                    <option value="SHEET">Листовые (Акрил/ПВХ)</option>
                    <option value="LED">Светодиоды & Блоки</option>
                    <option value="HARDWARE">Фурнитура & Клей</option>
                    <option value="OTHER">Прочее</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Единица измерения
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="м²">м² (квадратный метр)</option>
                    <option value="пог. м">пог. м (погонный метр)</option>
                    <option value="листов">листов (2.05×3.05м)</option>
                    <option value="шт">шт (штук)</option>
                    <option value="рулонов">рулонов</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Текущее количество
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Мин. остаток (оповещение)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.minThreshold}
                    onChange={(e) => setFormData({ ...formData, minThreshold: e.target.value })}
                    className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Себестоимость за единицу (UZS)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="22000"
                  value={formData.costPerUnit}
                  onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                  className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs"
                >
                  {editingId ? "Сохранить изменения" : "Добавить на склад"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка заявки поставщику (Дефицитная ведомость) */}
      <SupplierOrderModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        materials={materials}
      />
    </div>
  );
}
