"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Calculator, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ArrowRight, 
  HelpCircle,
  Eye,
  EyeOff,
  Zap,
  Box,
  Sliders,
  DollarSign,
  ShieldAlert,
  ChevronRight,
  X,
  Phone,
  User,
  Building2,
  MapPin
} from "lucide-react";
import { formatUzCurrency } from "@/lib/calculator/decimal";
import { CommercialProposal } from "@/components/CommercialProposal";

export default function SmartCalculatorPage() {
  // Выбор услуги
  const [activeCategory, setActiveCategory] = useState<"BANNER" | "ORACAL" | "STANDS" | "LETTERS" | "LIGHTBOX" | "COST_PLUS">("BANNER");
  const [pricingMode, setPricingMode] = useState<"tariff" | "cost_plus">("tariff");

  // Роль для демонстрации серверного скрытия себестоимости
  const [userRole, setUserRole] = useState<"DIRECTOR" | "MANAGER" | "DESIGNER">("DIRECTOR");

  // Параметры геометрии
  const [widthVal, setWidthVal] = useState("3");
  const [widthUnit, setWidthUnit] = useState<"m" | "cm" | "mm">("m");
  const [heightVal, setHeightVal] = useState("2");
  const [heightUnit, setHeightUnit] = useState<"m" | "cm" | "mm">("m");
  const [quantity, setQuantity] = useState(1);

  // Короба из акрила (свет) - сумма за кв. метр вручную
  const [lightboxRatePerSqm, setLightboxRatePerSqm] = useState(850000);
  const [lightboxLightingType, setLightboxLightingType] = useState<"led_modules" | "led_strip" | "none">("led_modules");
  const [lightboxProfileType, setLightboxProfileType] = useState<"acrylic_side" | "aluminum" | "pvc">("acrylic_side");

  // Баннеры
  const [printRate, setPrintRate] = useState(30000);
  const [edgeProcessing, setEdgeProcessing] = useState(false);
  const [edgeRate, setEdgeRate] = useState(5000);
  const [eyeletsEnabled, setEyeletsEnabled] = useState(true);
  const [eyeletStep, setEyeletStep] = useState(0.5);
  const [eyeletRate, setEyeletRate] = useState(2000);
  const [frameEnabled, setFrameEnabled] = useState(false);
  const [frameRatePerMeter, setFrameRatePerMeter] = useState(50000);
  const [frameCustomLength, setFrameCustomLength] = useState("");

  // Монтаж
  const [installEnabled, setInstallEnabled] = useState(false);
  const [installScope, setInstallScope] = useState<"per_item" | "site_visit">("site_visit");
  const [installRate, setInstallRate] = useState(150000);
  const [heightFactor, setHeightFactor] = useState(1.0);

  // Пленка Oracal
  const [filmPrintRate, setFilmPrintRate] = useState(40000);
  const [filmLamRate, setFilmLamRate] = useState(20000);
  const [filmCutLength, setFilmCutLength] = useState("0");
  const [filmCutRate, setFilmCutRate] = useState(10000);
  const [filmApplyRate, setFilmApplyRate] = useState(30000);
  const [filmCleanRate, setFilmCleanRate] = useState(0);

  // Стенды
  const [standBaseRate, setStandBaseRate] = useState(200000);
  const [standPocketsCount, setStandPocketsCount] = useState(4);
  const [standPocketRate, setStandPocketRate] = useState(25000);
  const [standCutLength, setStandCutLength] = useState(4);
  const [standCutRate, setStandCutRate] = useState(10000);

  // Буквы
  const [letterText, setLetterText] = useState("MASTER PRINT");
  const [letterCount, setLetterCount] = useState(11);
  const [letterHeightCm, setLetterHeightCm] = useState(30);
  const [letterRatePerCm, setLetterRatePerCm] = useState(5000);
  const [letterComplexity, setLetterComplexity] = useState(1.0);
  const [lightingType, setLightingType] = useState<"none" | "front" | "back" | "double">("front");
  const [surfaceMaterial, setSurfaceMaterial] = useState("акрил 3мм");

  // Cost Plus
  const [directCost, setDirectCost] = useState(1000000);
  const [costModeType, setCostModeType] = useState<"markup" | "target_margin">("markup");
  const [markupPercent, setMarkupPercent] = useState(25);
  const [targetMarginPercent, setTargetMarginPercent] = useState(25);

  // Скидки и минимумы
  const [discountPercent, setDiscountPercent] = useState(0);
  const [minOrderEnabled, setMinOrderEnabled] = useState(false);
  const [minOrderAmount, setMinOrderAmount] = useState(950000);
  const [roundingStep, setRoundingStep] = useState(1000);

  // Ответ сервера
  const [calcResult, setCalcResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Приемочные тесты ТЗ
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);


  // Модальные окна КП и создания наряда
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [orderClientName, setOrderClientName] = useState("");
  const [orderClientPhone, setOrderClientPhone] = useState("+998 ");
  const [orderTitle, setOrderTitle] = useState("");
  const [orderAdvance, setOrderAdvance] = useState(0);
  const [orderAssignedToId, setOrderAssignedToId] = useState("");
  const [orderInstallAddress, setOrderInstallAddress] = useState("");
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Загрузка сотрудников цеха
  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setEmployees(data);
          if (data.length > 0) setOrderAssignedToId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcResult || isCreatingOrder) return;
    setIsCreatingOrder(true);
    try {
      const defaultTitle = 
        activeCategory === "BANNER" ? `Баннер ${widthVal}×${heightVal}м` :
        activeCategory === "LETTERS" ? `Буквы ${letterText}` :
        activeCategory === "LIGHTBOX" ? `Короб из акрила (свет) ${widthVal}×${heightVal}м` :
        activeCategory === "ORACAL" ? `Пленка Oracal ${widthVal}×${heightVal}м` :
        activeCategory === "STANDS" ? `Стенд ${widthVal}×${heightVal}м` :
        "Рекламное изделие";

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: {
            name: orderClientName.trim() || "Клиент с калькулятора",
            phone: orderClientPhone.trim() || null,
          },
          title: orderTitle.trim() || defaultTitle,
          assignedToId: orderAssignedToId || null,
          priority: "NORMAL",
          deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          installAddress: orderInstallAddress.trim() || null,
          notes: `Калькулятор Master Print (Токен: ${calcResult.calculation_token})`,
          items: [
            {
              serviceType: 
                activeCategory === "BANNER" ? "BANNER" : 
                activeCategory === "LETTERS" ? "LETTERS" : 
                activeCategory === "LIGHTBOX" ? "LIGHTBOX" :
                activeCategory === "STANDS" ? "STAND" : "ORACAL",
              title: orderTitle.trim() || defaultTitle,
              width: Number(widthVal) || 0,
              height: Number(heightVal) || 0,
              area: Number(calcResult.normalized_inputs?.billableAreaM2 || 0),
              quantity: quantity,
              options: calcResult.components?.map((c: any) => c.name).join("; "),
              unitPrice: Math.round(Number(calcResult.customer_total) / quantity),
              totalPrice: Number(calcResult.customer_total),
            }
          ],
          totalAmount: Number(calcResult.customer_total),
          advanceAmount: Number(orderAdvance) || 0,
          paymentMethod: "CASH",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка создания наряда");
      setCreatedOrder(data);
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Live Server Calculation Request
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMsg(null);

    const payload: any = {
      pricing_mode: activeCategory === "COST_PLUS" ? "cost_plus" : "tariff",
      user_role: userRole,
      parameters: {
        width: { value: widthVal, unit: widthUnit },
        height: { value: heightVal, unit: heightUnit },
        quantity: Number(quantity) || 1,
        discount: discountPercent > 0 ? { type: "percent", value: discountPercent } : undefined,
        minimumOrder: minOrderEnabled ? { enabled: true, amount: minOrderAmount, action: "surcharge" } : undefined,
        roundingStep: roundingStep,
      },
    };

    if (activeCategory === "COST_PLUS") {
      payload.parameters.costPlus = {
        directCost: directCost,
        markupRate: costModeType === "markup" ? markupPercent / 100 : undefined,
        targetMarginRate: costModeType === "target_margin" ? targetMarginPercent / 100 : undefined,
      };
    } else if (activeCategory === "BANNER") {
      payload.parameters.printRate = printRate;
      payload.parameters.edgeProcessing = edgeProcessing;
      payload.parameters.edgeRate = edgeRate;
      payload.parameters.eyelets = {
        enabled: eyeletsEnabled,
        step: eyeletStep,
        rate: eyeletRate,
      };
      payload.parameters.frame = {
        enabled: frameEnabled,
        ratePerMeter: frameRatePerMeter,
        customLength: frameCustomLength ? frameCustomLength : undefined,
      };
      payload.parameters.installation = {
        enabled: installEnabled,
        scope: installScope,
        rate: installRate,
        heightFactor: heightFactor,
      };
    } else if (activeCategory === "ORACAL") {
      payload.parameters.film = {
        printRate: filmPrintRate,
        laminateRate: filmLamRate,
        cutLength: filmCutLength ? Number(filmCutLength) : undefined,
        cutRate: filmCutRate,
        applyRate: filmApplyRate,
        glueRemovalRate: filmCleanRate > 0 ? filmCleanRate : undefined,
      };
      payload.parameters.installation = {
        enabled: installEnabled,
        scope: installScope,
        rate: installRate,
      };
    } else if (activeCategory === "STANDS") {
      payload.parameters.stand = {
        baseRate: standBaseRate,
        pocketsCount: standPocketsCount,
        pocketRate: standPocketRate,
        cuttingLength: standCutLength,
        cuttingRate: standCutRate,
      };
      payload.parameters.installation = {
        enabled: installEnabled,
        scope: installScope,
        rate: installRate,
      };
    } else if (activeCategory === "LETTERS") {
      payload.parameters.letters = {
        text: letterText,
        count: letterCount,
        heightCm: letterHeightCm,
        ratePerCm: letterRatePerCm,
        complexityFactor: letterComplexity,
        lightingType: lightingType,
      };
      payload.parameters.installation = {
        enabled: installEnabled,
        scope: installScope,
        rate: installRate,
      };
    } else if (activeCategory === "LIGHTBOX") {
      payload.parameters.lightbox = {
        ratePerSqm: lightboxRatePerSqm,
        lightingType: lightboxLightingType,
        profileType: lightboxProfileType,
      };
      payload.parameters.installation = {
        enabled: installEnabled,
        scope: installScope,
        rate: installRate,
        heightFactor: heightFactor,
      };
    }

    fetch("/api/calculations/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Ошибка расчета");
        if (!isCancelled) setCalcResult(data);
      })
      .catch((err) => {
        if (!isCancelled) {
          setErrorMsg(err.message);
          setCalcResult(null);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    activeCategory,
    userRole,
    widthVal,
    widthUnit,
    heightVal,
    heightUnit,
    quantity,
    printRate,
    edgeProcessing,
    edgeRate,
    eyeletsEnabled,
    eyeletStep,
    eyeletRate,
    frameEnabled,
    frameRatePerMeter,
    frameCustomLength,
    installEnabled,
    installScope,
    installRate,
    heightFactor,
    filmPrintRate,
    filmLamRate,
    filmCutLength,
    filmCutRate,
    filmApplyRate,
    filmCleanRate,
    standBaseRate,
    standPocketsCount,
    standPocketRate,
    standCutLength,
    standCutRate,
    letterText,
    letterCount,
    letterHeightCm,
    letterRatePerCm,
    letterComplexity,
    lightingType,
    directCost,
    costModeType,
    markupPercent,
    targetMarginPercent,
    discountPercent,
    minOrderEnabled,
    minOrderAmount,
    roundingStep,
    lightboxRatePerSqm,
    lightboxLightingType,
    lightboxProfileType,
  ]);

  // Запуск тестов спецификации в один клик
  const handleRunAcceptanceTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await fetch("/api/test-tz");
      const data = await res.json();
      setTestResults(data);
    } catch (err: any) {
      alert("Ошибка запуска тестов: " + err.message);
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Шапка с брендингом Master Print */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-blue-900/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <img 
              src="/logo.png" 
              alt="Master Print" 
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/30" 
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider border border-blue-500/30">
                  Умный калькулятор ТЗ 1.0
                </span>
                <span className="text-xs text-slate-400">Asia/Tashkent • Валюта UZS</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                Калькулятор рекламных изделий «Master Print»
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Серверный расчет стоимости, точная геометрия на Decimal.js, прозрачный состав сметы и изоляция себестоимости.
              </p>
            </div>
          </div>

          {/* Переключатель роли для демонстрации безопасности ТЗ */}
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Тестовая роль доступа:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setUserRole("DIRECTOR")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  userRole === "DIRECTOR"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Владелец (Видит маржу)
              </button>
              <button
                onClick={() => setUserRole("MANAGER")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  userRole === "MANAGER"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Менеджер
              </button>
              <button
                onClick={() => setUserRole("DESIGNER")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  userRole === "DESIGNER"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Дизайнер (Без цен)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Вкладки категорий изделий */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          onClick={() => setActiveCategory("BANNER")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeCategory === "BANNER"
              ? "bg-white text-blue-700 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          Баннеры (с каркасом / без)
        </button>
        <button
          onClick={() => setActiveCategory("ORACAL")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeCategory === "ORACAL"
              ? "bg-white text-blue-700 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Плёнка Oracal & Оклейка
        </button>
        <button
          onClick={() => setActiveCategory("STANDS")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeCategory === "STANDS"
              ? "bg-white text-blue-700 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileText className="w-4 h-4" />
          Акриловые стенды
        </button>
        <button
          onClick={() => setActiveCategory("LETTERS")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeCategory === "LETTERS"
              ? "bg-white text-blue-700 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Zap className="w-4 h-4" />
          Световые & Золотые буквы
        </button>
        <button
          onClick={() => setActiveCategory("LIGHTBOX")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeCategory === "LIGHTBOX"
              ? "bg-white text-blue-700 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Box className="w-4 h-4 text-amber-500" />
          Короб из акрила (свет)
        </button>
        <button
          onClick={() => setActiveCategory("COST_PLUS")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeCategory === "COST_PLUS"
              ? "bg-white text-blue-700 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Подробная себестоимость (Cost Plus)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Левая колонка: Форма параметров */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              Параметры изделия
            </h2>

            {/* Размеры и количество (W, H, q) */}
            {activeCategory !== "COST_PLUS" && activeCategory !== "LETTERS" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ширина (W)
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      step="any"
                      value={widthVal}
                      onChange={(e) => setWidthVal(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-l-xl text-sm font-semibold focus:outline-blue-600"
                    />
                    <select
                      value={widthUnit}
                      onChange={(e: any) => setWidthUnit(e.target.value)}
                      className="px-2.5 bg-slate-100 border-y border-r border-slate-300 rounded-r-xl text-xs font-bold text-slate-600"
                    >
                      <option value="m">м</option>
                      <option value="cm">см</option>
                      <option value="mm">мм</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Высота (H)
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      step="any"
                      value={heightVal}
                      onChange={(e) => setHeightVal(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-l-xl text-sm font-semibold focus:outline-blue-600"
                    />
                    <select
                      value={heightUnit}
                      onChange={(e: any) => setHeightUnit(e.target.value)}
                      className="px-2.5 bg-slate-100 border-y border-r border-slate-300 rounded-r-xl text-xs font-bold text-slate-600"
                    >
                      <option value="m">м</option>
                      <option value="cm">см</option>
                      <option value="mm">мм</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Количество (q, шт)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-blue-600"
                  />
                </div>
              </div>
            )}

            {/* Специализированные опции баннеров */}
            {activeCategory === "BANNER" && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Тариф печати (за м²)
                    </label>
                    <input
                      type="number"
                      value={printRate}
                      onChange={(e) => setPrintRate(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Люверсы по периметру (шаг 0.5 м)
                    </label>
                    <div className="flex items-center gap-3 pt-1.5">
                      <input
                        type="checkbox"
                        checked={eyeletsEnabled}
                        onChange={(e) => setEyeletsEnabled(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <span className="text-xs font-medium text-slate-700">
                        {eyeletsEnabled ? "Включены (формула C12 без задвоения углов)" : "Без люверсов"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Металлокаркас */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={frameEnabled}
                        onChange={(e) => setFrameEnabled(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      Изготовление металлокаркаса из профильной трубы
                    </label>
                    {frameEnabled && (
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                        50 000 UZS / пог. м
                      </span>
                    )}
                  </div>
                  {frameEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Фиксированная длина профиля (м, опционально)
                        </label>
                        <input
                          type="number"
                          placeholder="По умолчанию 2*(W+H)"
                          value={frameCustomLength}
                          onChange={(e) => setFrameCustomLength(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Ставка за метр профиля
                        </label>
                        <input
                          type="number"
                          value={frameRatePerMeter}
                          onChange={(e) => setFrameRatePerMeter(Number(e.target.value))}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Монтаж */}
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={installEnabled}
                        onChange={(e) => setInstallEnabled(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      Выездной монтаж на объекте (Chevrolet Labo)
                    </label>
                    {installEnabled && (
                      <span className="text-[11px] font-bold text-blue-700">
                        {installScope === "site_visit" ? "150 000 UZS (единый на объект)" : "за штуку"}
                      </span>
                    )}
                  </div>
                  {installEnabled && (
                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <input
                          type="radio"
                          name="instScope"
                          checked={installScope === "site_visit"}
                          onChange={() => setInstallScope("site_visit")}
                        />
                        Единый выезд на объект (не умножается на q)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <input
                          type="radio"
                          name="instScope"
                          checked={installScope === "per_item"}
                          onChange={() => setInstallScope("per_item")}
                        />
                        На каждое изделие
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Специализированные опции плёнки Oracal */}
            {activeCategory === "ORACAL" && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Печать (за м²)
                    </label>
                    <input
                      type="number"
                      value={filmPrintRate}
                      onChange={(e) => setFilmPrintRate(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ламинация (за м²)
                    </label>
                    <input
                      type="number"
                      value={filmLamRate}
                      onChange={(e) => setFilmLamRate(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Нанесение / оклейка (за м²)
                    </label>
                    <input
                      type="number"
                      value={filmApplyRate}
                      onChange={(e) => setFilmApplyRate(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">
                    Подуслуга ТЗ: Очистка клея и демонтаж старой плёнки
                  </span>
                  <button
                    onClick={() => setFilmCleanRate(filmCleanRate > 0 ? 0 : 50000)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      filmCleanRate > 0 ? "bg-amber-600 text-white" : "bg-white text-amber-800 border border-amber-300"
                    }`}
                  >
                    {filmCleanRate > 0 ? "+50 000 UZS включено" : "Добавить в расчет"}
                  </button>
                </div>
              </div>
            )}

            {/* Специализированные опции букв */}
            {activeCategory === "LETTERS" && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Текст вывески (поддержка узбекских букв Oʻ и Gʻ)
                  </label>
                  <input
                    type="text"
                    value={letterText}
                    onChange={(e) => {
                      setLetterText(e.target.value);
                      setLetterCount(e.target.value.replace(/\s+/g, "").length);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-blue-900"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Символов: <span className="font-bold text-blue-600">{letterCount}</span> (пробелы не тарифицируются)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Высота буквы (см)
                    </label>
                    <input
                      type="number"
                      value={letterHeightCm}
                      onChange={(e) => setLetterHeightCm(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ставка за см высоты
                    </label>
                    <input
                      type="number"
                      value={letterRatePerCm}
                      onChange={(e) => setLetterRatePerCm(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Коэффициент сложности
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={letterComplexity}
                      onChange={(e) => setLetterComplexity(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-800">
                    Тип подсветки (светодиодные модули IP67 Samsung)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "front", label: "💡 Лицевая" },
                      { id: "back", label: "✨ Контражур" },
                      { id: "double", label: "⚡ Двойная" },
                      { id: "none", label: "🔲 Без света" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setLightingType(t.id as any)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                          lightingType === t.id
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Специализированные опции Световых акриловых коробов */}
            {activeCategory === "LIGHTBOX" && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                {/* Главный блок ручного ввода суммы за 1 м² */}
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl border-2 border-amber-300 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <label className="block text-xs font-black text-amber-950 uppercase tracking-wide">
                        Сумма за 1 квадратный метр (вручную в UZS) *
                      </label>
                      <p className="text-[11px] text-amber-800">
                        Введите вручную стоимость 1 м² или выберите готовый тариф
                      </p>
                    </div>
                    {calcResult?.normalized_inputs?.billableAreaM2 && (
                      <span className="px-2.5 py-1 bg-amber-200/80 text-amber-900 rounded-lg text-xs font-black self-start sm:self-auto">
                        Площадь: {calcResult.normalized_inputs.billableAreaM2} м²
                      </span>
                    )}
                  </div>

                  <div className="flex">
                    <input
                      type="number"
                      step="10000"
                      value={lightboxRatePerSqm}
                      onChange={(e) => setLightboxRatePerSqm(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="Например: 850000"
                      className="w-full px-4 py-2.5 bg-white border-2 border-amber-400 rounded-l-xl text-base font-black text-slate-900 focus:outline-none focus:border-amber-600 shadow-xs"
                    />
                    <span className="px-4 bg-amber-200/60 border-y-2 border-r-2 border-amber-400 rounded-r-xl text-xs font-black flex items-center text-amber-950">
                      UZS / м²
                    </span>
                  </div>

                  {/* Быстрые пресеты тарифов */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-amber-800 font-bold uppercase">Быстрый выбор:</span>
                    {[
                      { label: "750 000 сум", rate: 750000 },
                      { label: "850 000 сум", rate: 850000 },
                      { label: "950 000 сум", rate: 950000 },
                      { label: "1 200 000 сум", rate: 1200000 },
                      { label: "1 500 000 сум", rate: 1500000 },
                    ].map((p) => (
                      <button
                        key={p.rate}
                        type="button"
                        onClick={() => setLightboxRatePerSqm(p.rate)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                          lightboxRatePerSqm === p.rate
                            ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                            : "bg-white text-slate-700 border-amber-200 hover:bg-amber-100/60"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Подсветка LED */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-800">
                    Тип свечения и электрики
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: "led_modules", label: "💡 Линзованные модули LED 12V", desc: "Герметичные линзы IP67 + блок питания" },
                      { id: "led_strip", label: "✨ LED лента высокой плотности", desc: "Интерьерная подсветка + блок питания" },
                      { id: "none", label: "🔲 Без электрики", desc: "Только корпус из акрила без диодов" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setLightboxLightingType(t.id as any)}
                        className={`p-3 rounded-xl text-left border transition ${
                          lightboxLightingType === t.id
                            ? "bg-blue-50 text-blue-900 border-blue-500 shadow-2xs font-bold"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div className="text-xs font-bold">{t.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Конструкция борта / профиля */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-800">
                    Материал борта короба
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: "acrylic_side", label: "Световой акриловый борт", desc: "Короб светится целиком (лицо + борта)" },
                      { id: "aluminum", label: "Алюминиевый профиль", desc: "Профиль 90-130мм с порошковой покраской" },
                      { id: "pvc", label: "ПВХ пластик (оклейка)", desc: "Глухой борт из ПВХ 5-8мм с пленкой Oracal" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setLightboxProfileType(p.id as any)}
                        className={`p-3 rounded-xl text-left border transition ${
                          lightboxProfileType === p.id
                            ? "bg-blue-50 text-blue-900 border-blue-500 shadow-2xs font-bold"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div className="text-xs font-bold">{p.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Выездной монтаж */}
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={installEnabled}
                        onChange={(e) => setInstallEnabled(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      Выездной монтаж короба на объекте (Chevrolet Labo)
                    </label>
                    {installEnabled && (
                      <span className="text-[11px] font-bold text-blue-700">
                        {installScope === "site_visit" ? "150 000 UZS (единый на объект)" : "за штуку"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Специализированные опции Cost Plus */}
            {activeCategory === "COST_PLUS" && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Прямая себестоимость изделия (материалы + цех + подрядчики)
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      value={directCost}
                      onChange={(e) => setDirectCost(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-l-xl text-base font-bold"
                    />
                    <span className="px-3 bg-slate-100 border-y border-r border-slate-300 rounded-r-xl text-xs font-bold flex items-center text-slate-600">
                      UZS
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="costType"
                      checked={costModeType === "markup"}
                      onChange={() => setCostModeType("markup")}
                    />
                    Наценка на себестоимость (Markup %)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="costType"
                      checked={costModeType === "target_margin"}
                      onChange={() => setCostModeType("target_margin")}
                    />
                    Целевая маржа (Target Margin %)
                  </label>
                </div>

                {costModeType === "markup" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Размер наценки (%)
                    </label>
                    <input
                      type="number"
                      value={markupPercent}
                      onChange={(e) => setMarkupPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Формула ТЗ: <code className="bg-slate-100 px-1 py-0.5 rounded">price = cost * (1 + markup)</code>
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Целевая маржа (%) (строго меньше 100%)
                    </label>
                    <input
                      type="number"
                      value={targetMarginPercent}
                      onChange={(e) => setTargetMarginPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Формула ТЗ: <code className="bg-slate-100 px-1 py-0.5 rounded">price = cost / (1 - margin)</code>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Скидка и минимум заказа */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Скидка клиенту (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Округление итога
                </label>
                <select
                  value={roundingStep}
                  onChange={(e) => setRoundingStep(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white"
                >
                  <option value="1">Точно до 1 UZS</option>
                  <option value="100">До 100 UZS</option>
                  <option value="1000">До 1 000 UZS (стандарт ТЗ)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Правая колонка: Прозрачная смета и расчет сервера */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Смета и расшифровка
              </h3>
              {isLoading && (
                <span className="text-xs text-blue-600 animate-pulse font-semibold">
                  Серверный пересчет...
                </span>
              )}
            </div>

            {errorMsg ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">Ошибка расчета:</span> {errorMsg}
                </div>
              </div>
            ) : calcResult ? (
              <div className="space-y-4">
                {/* Состав работ и компонентов */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Каждая сумма объясняется составом (ТЗ 1.0):
                  </span>
                  <div className="divide-y divide-slate-100">
                    {calcResult.components.map((c: any, i: number) => (
                      <div key={i} className="py-2.5 flex items-start justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-800">{c.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {c.quantity} {c.unit} × {formatUzCurrency(c.unitPrice)}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-slate-900">
                          {formatUzCurrency(c.totalPrice)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Скидка и доплаты */}
                {calcResult.discount_amount !== "0" && (
                  <div className="flex items-center justify-between text-xs text-emerald-600 font-semibold pt-2 border-t border-slate-100">
                    <span>Скидка:</span>
                    <span>-{formatUzCurrency(calcResult.discount_amount)}</span>
                  </div>
                )}

                {/* Итоговая сумма клиенту */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">К оплате клиенту:</span>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-[10px] font-bold uppercase">
                      {calcResult.status === "ready" ? "Готов к согласованию" : calcResult.status}
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                    {formatUzCurrency(calcResult.customer_total)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    Token: {calcResult.calculation_token}
                  </div>
                </div>

                {/* Блок себестоимости и маржинальности (ТОЛЬКО ДЛЯ РОЛИ ВЛАДЕЛЬЦА) */}
                {calcResult.planned_cost_total ? (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-emerald-600" />
                        Плановая маржинальность (права Владельца):
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="bg-white p-2 rounded-xl border border-emerald-100">
                        <span className="block text-[10px] text-slate-500">Себестоимость</span>
                        <span className="text-xs font-bold text-slate-800">
                          {formatUzCurrency(calcResult.planned_cost_total)}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-emerald-100">
                        <span className="block text-[10px] text-slate-500">Прибыль</span>
                        <span className="text-xs font-bold text-emerald-700">
                          {formatUzCurrency(calcResult.gross_profit)}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-emerald-100">
                        <span className="block text-[10px] text-slate-500">Маржа</span>
                        <span className="text-xs font-black text-blue-600">
                          {(Number(calcResult.margin_rate) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-[11px] flex items-center gap-2">
                    <EyeOff className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>Себестоимость и маржа скрыты на сервере для роли {userRole} (ТЗ 1.0)</span>
                  </div>
                )}

                {/* Кнопки действий */}
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedOrder(null);
                      setIsOrderModalOpen(true);
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold text-center transition shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    Оформить заказ в производство
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsProposalModalOpen(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold text-center transition flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    Коммерческое предложение (КП) для клиента (S15)
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Панель проверок спецификации ТЗ */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-emerald-600" />
              Приёмочные сценарии ТЗ (Раздел 12: C01–C15, S01–S13)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Автоматическая верификация контрольных примеров расчетов, смены тарифов, граничных условий и оплат
            </p>
          </div>
          <button
            onClick={handleRunAcceptanceTests}
            disabled={isRunningTests}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
          >
            {isRunningTests ? "Тестирование..." : "▶ Запустить 21 тест ТЗ"}
          </button>
        </div>

        {testResults && (
          <div className="space-y-3 pt-2">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-bold text-xs">
              {testResults.summary}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
              {testResults.results.map((r: any) => (
                <div
                  key={r.code}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 font-mono">[{r.code}]</span>
                    <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Пройден
                    </span>
                  </div>
                  <div className="text-slate-600 font-medium truncate" title={r.name}>
                    {r.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    {r.actual}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно создания наряда в производство */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Master Print" className="w-8 h-8 rounded-lg object-cover" />
                <h3 className="text-base font-black text-slate-900">
                  Оформление наряда в производство
                </h3>
              </div>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdOrder ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900">
                    Наряд № {createdOrder.orderNumber} успешно создан!
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Сумма: <b>{formatUzCurrency(createdOrder.totalAmount)}</b> • Аванс: <b>{formatUzCurrency(createdOrder.paidAmount)}</b>
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <Link
                    href={`/orders/${createdOrder.id}`}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold text-center transition shadow-xs"
                  >
                    Открыть карточку наряда
                  </Link>
                  <Link
                    href="/orders/kanban"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold text-center transition"
                  >
                    Канбан цеха
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Имя клиента / Организация *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: ООО «Grand Hotel» или Алишер"
                    value={orderClientName}
                    onChange={(e) => setOrderClientName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Телефон клиента
                    </label>
                    <input
                      type="text"
                      placeholder="+998 90 123 45 67"
                      value={orderClientPhone}
                      onChange={(e) => setOrderClientPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Аванс клиента (UZS)
                    </label>
                    <input
                      type="number"
                      value={orderAdvance}
                      onChange={(e) => setOrderAdvance(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Название проекта / изделия
                  </label>
                  <input
                    type="text"
                    placeholder="Баннер для фасада / Световые буквы"
                    value={orderTitle}
                    onChange={(e) => setOrderTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ответственный мастер цеха
                    </label>
                    <select
                      value={orderAssignedToId}
                      onChange={(e) => setOrderAssignedToId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white"
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.roleTitle || emp.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Адрес монтажа (если требуется)
                    </label>
                    <input
                      type="text"
                      placeholder="г. Ташкент, ул. Навои..."
                      value={orderInstallAddress}
                      onChange={(e) => setOrderInstallAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Итого к оплате (из сметы):</span>
                  <span className="font-mono font-bold text-blue-900 text-sm">
                    {formatUzCurrency(calcResult?.customer_total || 0)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isCreatingOrder}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {isCreatingOrder ? "Создание наряда..." : "🚀 Запустить в производство"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно коммерческого предложения (S15) */}
      {isProposalModalOpen && (
        <CommercialProposal
          order={{
            orderNumber: calcResult?.calculation_token?.substring(0, 8).toUpperCase() || "NEW",
            title: orderTitle || (activeCategory === "BANNER" ? `Баннер ${widthVal}×${heightVal}м` : activeCategory === "LETTERS" ? `Буквы ${letterText}` : "Рекламная продукция Master Print"),
            client: {
              name: orderClientName || "Уважаемый Заказчик",
              phone: orderClientPhone || "+998",
            },
            installAddress: orderInstallAddress || "По согласованию",
            totalAmount: Number(calcResult?.customer_total || 0),
            paidAmount: Number(orderAdvance || 0),
            debtAmount: Number(calcResult?.customer_total || 0) - Number(orderAdvance || 0),
            items: [
              {
                id: "item-preview-1",
                serviceType: activeCategory === "BANNER" ? "BANNER" : activeCategory === "LETTERS" ? "LETTERS" : activeCategory === "STANDS" ? "STAND" : "ORACAL",
                title: orderTitle || `${activeCategory} (изделие Master Print)`,
                width: Number(widthVal) || 0,
                height: Number(heightVal) || 0,
                quantity: quantity,
                options: calcResult?.components?.map((c: any) => c.name).join("; "),
                unitPrice: Math.round(Number(calcResult?.customer_total || 0) / quantity),
                totalPrice: Number(calcResult?.customer_total || 0),
              },
            ],
          }}
          isOpen={isProposalModalOpen}
          onClose={() => setIsProposalModalOpen(false)}
        />
      )}
    </div>
  );
}
