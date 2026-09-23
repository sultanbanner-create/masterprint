"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Zap, 
  ChevronLeft, 
  Copy, 
  Check, 
  Lightbulb, 
  ShieldCheck, 
  AlertTriangle,
  Info,
  Layers,
  Sparkles
} from "lucide-react";

export default function LedCalculatorPage() {
  // Параметры вывески
  const [calcMode, setCalcMode] = useState<"LETTERS" | "MANUAL">("LETTERS");
  const [letterHeight, setLetterHeight] = useState<number>(40); // см
  const [letterCount, setLetterCount] = useState<number>(6);
  const [depth, setDepth] = useState<number>(80); // мм (60, 80, 100, 130)
  const [manualModules, setManualModules] = useState<number>(100);

  // Выбор светодиодных модулей
  const [moduleType, setModuleType] = useState<"SAMSUNG_12" | "MINI_072" | "POWER_15" | "NEON_12V">("SAMSUNG_12");
  const [wireLength, setWireLength] = useState<number>(5); // метров от БП до вывески
  const [copied, setCopied] = useState(false);

  // Справочник модулей
  const MODULE_SPECS = {
    SAMSUNG_12: {
      name: "Samsung 1.2W (3 LED, линза 160°)",
      power: 1.2,
      voltage: 12,
      cost: 4500, // сум за модуль
      maxChain: 25, // макс модулей в одном шлейфе без параллельного ввода
      desc: "Оптимален для букв высотой от 30 до 100 см с глубиной 70-100 мм",
    },
    MINI_072: {
      name: "Мини-модуль 0.72W (2 LED)",
      power: 0.72,
      voltage: 12,
      cost: 3200,
      maxChain: 35,
      desc: "Для мелких букв (15-30 см) и тонких засечек шрифта",
    },
    POWER_15: {
      name: "Мощный модуль 1.5W (4 LED)",
      power: 1.5,
      voltage: 12,
      cost: 5800,
      maxChain: 20,
      desc: "Для больших крышных букв >100 см и глубоких коробов",
    },
    NEON_12V: {
      name: "Гибкий LED Неон 12V (пог. метры)",
      power: 9.6, // Вт на метр
      voltage: 12,
      cost: 38000, // сум за метр
      maxChain: 5,
      desc: "Для открытого неона на подложке (расчет в метрах)",
    },
  };

  const spec = MODULE_SPECS[moduleType];

  // Расчет количества модулей
  let totalModules = 0;
  if (calcMode === "LETTERS") {
    if (moduleType === "NEON_12V") {
      // Примерный метраж неона: периметр буквы ~ 3.5 * высота в метрах
      const meterPerLetter = (letterHeight / 100) * 3.2;
      totalModules = Math.ceil(meterPerLetter * letterCount); // в метрах
    } else {
      // Коэффициент плотности в зависимости от глубины (чем меньше глубина, тем плотнее надо ставить, чтоб не было точек)
      let densityFactor = 1.0;
      if (depth <= 60) densityFactor = 1.35; // плотнее
      else if (depth <= 80) densityFactor = 1.15;
      else if (depth <= 100) densityFactor = 1.0;
      else densityFactor = 0.85; // для глубоких коробов 130мм

      // В среднем на 1 см высоты стандартной буквы идет ~0.45 модуля при глубине 100мм
      const modulesPerLetter = Math.ceil((letterHeight * 0.45) * densityFactor);
      totalModules = modulesPerLetter * letterCount;
    }
  } else {
    totalModules = manualModules;
  }

  // Электрические параметры
  const nominalPower = Math.round(totalModules * spec.power);
  // Запас по мощности 25% (ГОСТ и стандарт наружной рекламы для долговечности БП)
  const powerWithReserve = Math.round(nominalPower * 1.25);

  // Рекомендация блока питания
  let recommendedPSU = "";
  if (powerWithReserve <= 60) recommendedPSU = "1× БП 60W 12V IP67 (герметичный)";
  else if (powerWithReserve <= 100) recommendedPSU = "1× БП 100W 12V IP67 (герметичный)";
  else if (powerWithReserve <= 150) recommendedPSU = "1× БП 150W 12V IP67 (герметичный)";
  else if (powerWithReserve <= 200) recommendedPSU = "1× БП 200W 12V IP67 (герметичный)";
  else if (powerWithReserve <= 250) recommendedPSU = "1× БП 250W 12V IP67 (герметичный)";
  else if (powerWithReserve <= 350) recommendedPSU = "1× БП 350W 12V IP67 (или 2× 150W)";
  else if (powerWithReserve <= 500) recommendedPSU = "2× БП 250W 12V IP67 (раздельные контуры)";
  else {
    const count300 = Math.ceil(powerWithReserve / 300);
    recommendedPSU = `${count300}× БП 300W 12V IP67 (раздельные группы питания)`;
  }

  // Количество точек ввода питания (каждые maxChain модулей параллельный провод)
  const powerFeedDrops = Math.ceil(totalModules / spec.maxChain);

  // Рекомендация сечения кабеля
  let wireRecommendation = "ШВВП 2×0.75 мм² Cu";
  if (wireLength > 15 || nominalPower > 200) {
    wireRecommendation = "ПВС 2×2.5 мм² Cu (минимизация просадки напряжения 12V)";
  } else if (wireLength > 6 || nominalPower > 100) {
    wireRecommendation = "ПВС 2×1.5 мм² Cu (рекомендуемое для фасадных линий)";
  }

  // Оценочная стоимость диодов
  const estimatedCost = totalModules * spec.cost;

  const copySpec = () => {
    const text = 
      `⚡ СПЕЦИФИКАЦИЯ СВЕТОТЕХНИКИ ДЛЯ ЦЕХА (Мастеру Абзалу):\n` +
      `• Изделие: ${calcMode === "LETTERS" ? `Световые буквы (${letterCount} шт, высота ${letterHeight} см, глубина ${depth} мм)` : "Световой короб / конструкция"}\n` +
      `• Модули: ${spec.name}\n` +
      `• Количество: ${totalModules} ${moduleType === "NEON_12V" ? "пог. м" : "шт"}\n` +
      `• Потребляемая мощность нагрузки: ${nominalPower} Вт\n` +
      `• Мощность с запасом +25%: ${powerWithReserve} Вт\n` +
      `• Рекомендуемый блок питания: ${recommendedPSU}\n` +
      `• Точек ввода питания (параллель): ${powerFeedDrops} шт (каждые ${spec.maxChain} модулей)\n` +
      `• Рекомендуемый кабель питания: ${wireRecommendation}\n` +
      `• Оценочная себестоимость диодов: ${estimatedCost.toLocaleString()} сум`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                <Zap className="w-5 h-5 fill-amber-500 text-amber-600" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Расчет подсветки объемных букв & Блоков питания 12V
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Расчет модулей Samsung внутри акриловых букв и лайтбоксов мастера Абзала (без видеоэкранов)
            </p>
          </div>
        </div>

        <button
          onClick={copySpec}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow self-start sm:self-auto"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
          <span>{copied ? "Скопировано в буфер!" : "Скопировать наряд мастеру"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левая колонка: Входные параметры */}
        <div className="lg:col-span-2 space-y-5">
          {/* Режим ввода */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">Способ расчета:</span>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCalcMode("LETTERS")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    calcMode === "LETTERS" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                  }`}
                >
                  Объемные буквы из акрила
                </button>
                <button
                  type="button"
                  onClick={() => setCalcMode("MANUAL")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    calcMode === "MANUAL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                  }`}
                >
                  Световой короб (Лайтбокс)
                </button>
              </div>
            </div>

            {calcMode === "LETTERS" ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Высота буквы: <span className="text-teal-600 font-mono text-sm">{letterHeight} см</span>
                  </label>
                  <input
                    type="range"
                    min={15}
                    max={150}
                    step={5}
                    value={letterHeight}
                    onChange={(e) => setLetterHeight(Number(e.target.value))}
                    className="w-full accent-teal-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>15 см</span>
                    <span>50 см</span>
                    <span>100 см</span>
                    <span>150 см</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Количество букв: <span className="text-teal-600 font-mono text-sm">{letterCount} шт</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={letterCount}
                    onChange={(e) => setLetterCount(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Символов в вывеске</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Глубина борта буквы:
                  </label>
                  <select
                    value={depth}
                    onChange={(e) => setDepth(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  >
                    <option value={60}>60 мм (Тонкая буква, плотная укладка)</option>
                    <option value={80}>80 мм (Стандартный профиль)</option>
                    <option value={100}>100 мм (Классическая глубина)</option>
                    <option value={130}>130 мм (Глубокий короб)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Суммарное количество модулей для короба / букв:
                </label>
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={manualModules}
                  onChange={(e) => setManualModules(Math.max(1, Number(e.target.value)))}
                  className="w-full max-w-xs px-3 py-2 text-sm font-bold border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600 font-mono"
                />
              </div>
            )}
          </div>

          {/* Выбор типа модуля */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase block">
              Тип светодиодного модуля:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(MODULE_SPECS).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setModuleType(key as any)}
                  className={`p-3.5 rounded-xl border text-left transition relative ${
                    moduleType === key
                      ? "bg-amber-50/70 border-amber-400 text-amber-950 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{item.name}</span>
                    <span className="font-mono text-xs font-bold text-teal-700">{item.power} Вт</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{item.desc}</p>
                </button>
              ))}
            </div>

            {/* Длина питающей линии */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block">
                  Расстояние от БП до вывески (длина кабеля 12V):
                </label>
                <span className="text-[11px] text-slate-500">
                  Чем длиннее провод, тем больше падение вольтажа 12V
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={wireLength}
                  onChange={(e) => setWireLength(Math.max(1, Number(e.target.value)))}
                  className="w-20 px-2.5 py-1.5 text-xs font-bold text-center border border-slate-300 rounded-xl"
                />
                <span className="text-xs font-bold text-slate-600">метров</span>
              </div>
            </div>
          </div>

          {/* Инженерная памятка мастеру Абзалу */}
          <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 text-xs space-y-2 text-blue-900">
            <div className="flex items-center gap-2 font-bold text-blue-950">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Правила монтажа светодиодов цеха наружки:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-blue-800 text-[11px] pl-1">
              <li><b>Параллельный ввод:</b> никогда не соединяйте более 25-30 модулей последовательно в один шлейф, иначе последние буквы будут тускнеть и греться первые диоды.</li>
              <li><b>Запас мощности +25%:</b> блок питания не должен работать на пределе 100%, иначе в летнюю жару Ташкента/Узбекистана сработает термозащита.</li>
              <li><b>Герметичность:</b> на фасадных вывесках используйте блоки питания только <b>IP67</b> с заливкой компаундом, вентиляторные БП быстро забиваются пылью.</li>
            </ul>
          </div>
        </div>

        {/* Правая колонка: Результаты расчетов */}
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Итоговый расчёт
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] border border-amber-500/30 flex items-center gap-1">
                <Zap className="w-3 h-3 fill-amber-400" /> 12V DC
              </span>
            </div>

            {/* Количество диодов */}
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">
                Потребуется модулей:
              </div>
              <div className="text-3xl font-black text-white font-mono mt-0.5">
                {totalModules} <span className="text-sm font-bold text-slate-400">{moduleType === "NEON_12V" ? "пог. м" : "шт"}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Себестоимость диодов: <b className="text-amber-400">{estimatedCost.toLocaleString()} сум</b>
              </div>
            </div>

            {/* Мощность */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Нагрузка (нетто)</div>
                <div className="text-xl font-black text-slate-200 font-mono">{nominalPower} Вт</div>
              </div>
              <div>
                <div className="text-[10px] text-amber-400 uppercase font-bold">+25% Запас БП</div>
                <div className="text-xl font-black text-amber-400 font-mono">{powerWithReserve} Вт</div>
              </div>
            </div>

            {/* Рекомендуемый БП */}
            <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
              <div className="text-[10px] text-teal-400 uppercase font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Рекомендуемый блок питания:</span>
              </div>
              <div className="font-bold text-xs text-white">
                {recommendedPSU}
              </div>
            </div>

            {/* Точки ввода и кабель */}
            <div className="space-y-2 text-xs pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-slate-300">
                <span>Точек ввода питания:</span>
                <span className="font-bold text-white font-mono bg-slate-800 px-2 py-0.5 rounded">
                  {powerFeedDrops} параллельных линий
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Сечение кабеля:</span>
                <span className="font-bold text-teal-400 font-mono">
                  {wireRecommendation}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={copySpec}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Спецификация скопирована!" : "Скопировать для наряда"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
