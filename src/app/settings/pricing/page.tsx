"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ChevronLeft, 
  Coins, 
  Printer, 
  Save, 
  Check, 
  Sparkles, 
  Layers, 
  Truck, 
  Users,
  Percent
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function PricingSettingsPage() {
  const [saved, setSaved] = useState(false);

  // Тарифы продукции цеха наружки
  const [rates, setRates] = useState({
    // Буквы за 1 см высоты
    letterFaceLit: 6500,
    letterBackLit: 7000,
    letterDoubleLit: 8500,
    letterNonLit: 4000,
    letterNeon: 5500,

    // Баннеры за 1 м²
    banner510: 38000,
    banner440: 32000,
    bannerEyeletPrice: 1500, // за люверс

    // Лайтбоксы и пленка за 1 м²
    lightboxAcrylic: 850000,
    oracalPlotter: 65000,
    autoBrandingDamas: 1800000,

    // Монтаж
    mountingBaseRate: 200000,
    mountingPercent: 15, // % от стоимости изделия

    // Сдельные ставки мастеров
    albertPrintPerMeter: 3000, // сум/м²
    abzalLetterPerCm: 1200,    // сум/см
    abzalMountingShare: 30,    // % от монтажа
    jalgasSalesPercent: 5,     // % от суммы чека
    jalgasDesignFee: 50000,    // сум за макет
  });

  const handleChange = (key: string, val: number) => {
    setRates((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-100 text-teal-800 rounded-lg">
                <Coins className="w-5 h-5 text-teal-600" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Прейскурант & Тарифы цеха наружной рекламы
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Базовые расценки изделий и нормативы сдельной оплаты мастеров (Тимур, Жалгас, Абзал, Альберт)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Печать прайс-листа
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saved ? "Тарифы сохранены!" : "Сохранить тарифы"}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Световые объемные буквы (сум за 1 см высоты) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Световые объемные буквы (тариф за 1 см высоты):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">💡 Лицевое свечение</label>
              <input
                type="number"
                value={rates.letterFaceLit}
                onChange={(e) => handleChange("letterFaceLit", Number(e.target.value))}
                className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-600"
              />
              <span className="text-[10px] text-slate-400">сум / см высоты</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">✨ Контражур</label>
              <input
                type="number"
                value={rates.letterBackLit}
                onChange={(e) => handleChange("letterBackLit", Number(e.target.value))}
                className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-600"
              />
              <span className="text-[10px] text-slate-400">сум / см высоты</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">⚡ Двойное свечение</label>
              <input
                type="number"
                value={rates.letterDoubleLit}
                onChange={(e) => handleChange("letterDoubleLit", Number(e.target.value))}
                className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-600"
              />
              <span className="text-[10px] text-slate-400">сум / см высоты</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">🔲 Без подсветки (ПВХ)</label>
              <input
                type="number"
                value={rates.letterNonLit}
                onChange={(e) => handleChange("letterNonLit", Number(e.target.value))}
                className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-600"
              />
              <span className="text-[10px] text-slate-400">сум / см высоты</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">🌈 Гибкий LED Неон</label>
              <input
                type="number"
                value={rates.letterNeon}
                onChange={(e) => handleChange("letterNeon", Number(e.target.value))}
                className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-600"
              />
              <span className="text-[10px] text-slate-400">сум / см высоты</span>
            </div>
          </div>
        </div>

        {/* 2. Широкоформатная печать & Лайтбоксы */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Широкоформатная печать, лайтбоксы и автобрендинг:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">Баннер литой 510г</label>
              <input
                type="number"
                value={rates.banner510}
                onChange={(e) => handleChange("banner510", Number(e.target.value))}
                className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-600"
              />
              <span className="text-[10px] text-slate-400">сум / м²</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">Баннер ламинированный 440г</label>
              <input
                type="number"
                value={rates.banner440}
                onChange={(e) => handleChange("banner440", Number(e.target.value))}
                className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-600"
              />
              <span className="text-[10px] text-slate-400">сум / м²</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">Световой короб (Лайтбокс)</label>
              <input
                type="number"
                value={rates.lightboxAcrylic}
                onChange={(e) => handleChange("lightboxAcrylic", Number(e.target.value))}
                className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-600"
              />
              <span className="text-[10px] text-slate-400">сум / м²</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">Оклейка авто Chevrolet Damas/Labo</label>
              <input
                type="number"
                value={rates.autoBrandingDamas}
                onChange={(e) => handleChange("autoBrandingDamas", Number(e.target.value))}
                className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-600"
              />
              <span className="text-[10px] text-slate-400">сум за авто</span>
            </div>
          </div>
        </div>

        {/* 3. Сдельная выработка мастеров цеха */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Ставки сдельной оплаты труда команды (ФОТ):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Альберт */}
            <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 space-y-2">
              <div className="font-bold text-purple-900 text-xs">Альберт (Печатник)</div>
              <div>
                <label className="text-[11px] text-slate-600 block">Широкоформатная печать:</label>
                <input
                  type="number"
                  value={rates.albertPrintPerMeter}
                  onChange={(e) => handleChange("albertPrintPerMeter", Number(e.target.value))}
                  className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-600 mt-1"
                />
                <span className="text-[10px] text-slate-500">сум / м² готовой печати</span>
              </div>
            </div>

            {/* Абзал */}
            <div className="p-4 bg-orange-50/60 rounded-xl border border-orange-200 space-y-2">
              <div className="font-bold text-orange-900 text-xs">Абзал (Сборка & Монтаж)</div>
              <div>
                <label className="text-[11px] text-slate-600 block">Сборка световых букв:</label>
                <input
                  type="number"
                  value={rates.abzalLetterPerCm}
                  onChange={(e) => handleChange("abzalLetterPerCm", Number(e.target.value))}
                  className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-600 mt-1"
                />
                <span className="text-[10px] text-slate-500">сум / см высоты буквы</span>
              </div>
              <div className="pt-1">
                <label className="text-[11px] text-slate-600 block">Доля от монтажа на объекте:</label>
                <input
                  type="number"
                  value={rates.abzalMountingShare}
                  onChange={(e) => handleChange("abzalMountingShare", Number(e.target.value))}
                  className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-600 mt-1"
                />
                <span className="text-[10px] text-slate-500">% от стоимости монтажа</span>
              </div>
            </div>

            {/* Жалгас */}
            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
              <div className="font-bold text-blue-900 text-xs">Жалгас (Продажи & Макеты)</div>
              <div>
                <label className="text-[11px] text-slate-600 block">Комиссия от закрытой сделки:</label>
                <input
                  type="number"
                  value={rates.jalgasSalesPercent}
                  onChange={(e) => handleChange("jalgasSalesPercent", Number(e.target.value))}
                  className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-600 mt-1"
                />
                <span className="text-[10px] text-slate-500">% от общей суммы заказа</span>
              </div>
              <div className="pt-1">
                <label className="text-[11px] text-slate-600 block">Бонус за макет в CorelDRAW:</label>
                <input
                  type="number"
                  value={rates.jalgasDesignFee}
                  onChange={(e) => handleChange("jalgasDesignFee", Number(e.target.value))}
                  className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-600 mt-1"
                />
                <span className="text-[10px] text-slate-500">сум за утвержденный макет</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
