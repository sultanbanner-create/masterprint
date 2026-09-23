"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Check, 
  Calendar, 
  MapPin, 
  Phone, 
  Building2, 
  User, 
  Flame, 
  Upload, 
  Clock,
  ArrowRight,
  Sparkles,
  FileImage,
  Percent,
  CheckCircle2,
  X
} from "lucide-react";
import { formatCurrency, countLetters, cn } from "@/lib/utils";

export interface ItemRow {
  id: string;
  serviceType: "BANNER" | "LETTERS" | "LIGHTBOX" | "ORACAL" | "STAND" | "INSTALL" | "AUTO_BRANDING" | "CUSTOM";
  title: string;
  width?: number;
  height?: number;
  area?: number;
  quantity?: number;
  letterHeight?: number;
  letterCount?: number;
  letterText?: string;
  options?: string;
  hasFrame?: boolean;
  unitPrice: number;
  totalPrice: number;
}

export function OrderCalculator({ employees }: { employees: any[] }) {
  const router = useRouter();
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Клиент
  const [existingClients, setExistingClients] = useState<any[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Параметры наряда
  const [orderTitle, setOrderTitle] = useState("");
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [priority, setPriority] = useState<"NORMAL" | "URGENT">("NORMAL");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("18:00");
  const [installAddress, setInstallAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Оплата
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "TRANSFER">("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Позиции по умолчанию (чистый старт без навязанных цифр)
  const [items, setItems] = useState<ItemRow[]>([
    {
      id: "item-1",
      serviceType: "BANNER",
      title: "Широкоформатный баннер (печать)",
      width: undefined,
      height: undefined,
      area: 0,
      quantity: 1,
      unitPrice: 30000,
      options: "Люверсы по периметру 30 см, проклейка",
      hasFrame: false,
      totalPrice: 0,
    },
  ]);

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setExistingClients(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));

    const inTwoDays = new Date(Date.now() + 48 * 60 * 60 * 1000);
    setDeadlineDate(inTwoDays.toISOString().split("T")[0]);

    if (employees.length > 0) {
      const albert = employees.find((e) => e.name === "Альберт");
      setAssignedToId(albert ? albert.id : employees[0].id);
    }
  }, [employees]);

  // Закрытие выпадающего списка клиентов при клике вне его
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addItem = (type: ItemRow["serviceType"]) => {
    const newId = `item-${Date.now()}`;
    let newItem: ItemRow;

    if (type === "BANNER") {
      newItem = {
        id: newId,
        serviceType: "BANNER",
        title: "Широкоформатный баннер (печать)",
        width: undefined,
        height: undefined,
        area: 0,
        quantity: 1,
        unitPrice: 30000,
        options: "Люверсы по периметру 30 см, проклейка",
        hasFrame: false,
        totalPrice: 0,
      };
    } else if (type === "LETTERS") {
      newItem = {
        id: newId,
        serviceType: "LETTERS",
        title: "Световые буквы из акрила (LED)",
        letterText: "",
        letterCount: 0,
        letterHeight: 25,
        quantity: 1,
        unitPrice: 6500,
        options: "Акрил, светодиодные модули, блок 12V IP67",
        totalPrice: 0,
      };
    } else if (type === "LIGHTBOX") {
      newItem = {
        id: newId,
        serviceType: "LIGHTBOX",
        title: "Световой короб (Лайтбокс)",
        width: undefined,
        height: undefined,
        area: 0,
        quantity: 1,
        unitPrice: 750000,
        options: "Профиль алюминиевый, светорассеивающий акрил",
        totalPrice: 0,
      };
    } else if (type === "ORACAL") {
      newItem = {
        id: newId,
        serviceType: "ORACAL",
        title: "Печать пленки Oracal с накаткой",
        width: undefined,
        height: undefined,
        area: 0,
        quantity: 1,
        unitPrice: 50000,
        options: "Глянцевая ламинация",
        totalPrice: 0,
      };
    } else if (type === "STAND") {
      newItem = {
        id: newId,
        serviceType: "STAND",
        title: "Информационный стенд / Табличка",
        width: undefined,
        height: undefined,
        area: 0,
        quantity: 1,
        unitPrice: 350000,
        options: "ПВХ 4мм, карманы А4",
        totalPrice: 0,
      };
    } else if (type === "INSTALL") {
      newItem = {
        id: newId,
        serviceType: "INSTALL",
        title: "Монтажные работы на объекте",
        quantity: 1,
        unitPrice: 150000,
        options: "Выезд бригады, лестницы/леса",
        totalPrice: 150000,
      };
    } else if (type === "AUTO_BRANDING") {
      newItem = {
        id: newId,
        serviceType: "AUTO_BRANDING",
        title: "Оклейка авто (Chevrolet Damas / Labo)",
        quantity: 1,
        unitPrice: 650000,
        options: "Печать на авто-пленке с защитной ламинацией",
        totalPrice: 650000,
      };
    } else {
      newItem = {
        id: newId,
        serviceType: "CUSTOM",
        title: "Дополнительные работы / Свое",
        quantity: 1,
        unitPrice: 100000,
        totalPrice: 100000,
      };
    }

    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, patch: Partial<ItemRow>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...patch };

        if (["BANNER", "LIGHTBOX", "ORACAL", "STAND"].includes(updated.serviceType)) {
          const w = typeof updated.width === "number" && !isNaN(updated.width) ? updated.width : 0;
          const h = typeof updated.height === "number" && !isNaN(updated.height) ? updated.height : 0;
          const area = Math.round(w * h * 100) / 100;
          updated.area = area;
          const qty = typeof updated.quantity === "number" && !isNaN(updated.quantity) ? updated.quantity : 1;
          const price = typeof updated.unitPrice === "number" && !isNaN(updated.unitPrice) ? updated.unitPrice : 0;
          updated.totalPrice = Math.round(area * price * qty);
        }

        if (updated.serviceType === "LETTERS") {
          if (patch.letterText !== undefined) {
            updated.letterCount = countLetters(patch.letterText);
          }
          const letters = typeof updated.letterCount === "number" && !isNaN(updated.letterCount) ? updated.letterCount : 0;
          const height = typeof updated.letterHeight === "number" && !isNaN(updated.letterHeight) ? updated.letterHeight : 0;
          const qty = typeof updated.quantity === "number" && !isNaN(updated.quantity) ? updated.quantity : 1;
          const price = typeof updated.unitPrice === "number" && !isNaN(updated.unitPrice) ? updated.unitPrice : 0;
          updated.totalPrice = Math.round(letters * height * price * qty);
        }

        if (["INSTALL", "AUTO_BRANDING", "CUSTOM"].includes(updated.serviceType)) {
          const qty = typeof updated.quantity === "number" && !isNaN(updated.quantity) ? updated.quantity : 1;
          const price = typeof updated.unitPrice === "number" && !isNaN(updated.unitPrice) ? updated.unitPrice : 0;
          updated.totalPrice = Math.round(price * qty);
        }

        return updated;
      })
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const elem = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxWidth = 1280;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          elem.width = width;
          elem.height = height;
          const ctx = elem.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          setPreviewUrl(elem.toDataURL("image/jpeg", 0.75));
        };
      };
    }
  };

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  }, [items]);

  const debtAmount = useMemo(() => {
    return Math.max(0, totalAmount - advanceAmount);
  }, [totalAmount, advanceAmount]);

  const estimatedCost = useMemo(() => {
    return items.reduce((sum, item) => {
      let matCost = 0;
      let laborCost = 0;

      if (item.serviceType === "BANNER") {
        if (item.hasFrame) {
          matCost = (item.area || 0) * 22000;
          laborCost = (item.area || 0) * 8000;
        } else {
          matCost = (item.area || 0) * 15000;
          laborCost = (item.area || 0) * 3000;
        }
      } else if (item.serviceType === "LETTERS") {
        const totalCm = (item.letterCount || 0) * (item.letterHeight || 0) * (item.quantity || 1);
        matCost = totalCm * 2500;
        laborCost = totalCm * 1200;
      } else if (item.serviceType === "LIGHTBOX") {
        matCost = (item.area || 0) * 350000;
        laborCost = (item.area || 0) * 120000;
      } else if (item.serviceType === "ORACAL") {
        matCost = (item.area || 0) * 22000;
        laborCost = (item.area || 0) * 3000;
      } else if (item.serviceType === "AUTO_BRANDING") {
        matCost = (item.unitPrice || 0) * 0.35;
        laborCost = (item.unitPrice || 0) * 0.25;
      } else {
        matCost = (item.totalPrice || 0) * 0.4;
        laborCost = (item.totalPrice || 0) * 0.2;
      }

      return sum + matCost + laborCost;
    }, 0);
  }, [items]);

  const estimatedProfit = Math.max(0, totalAmount - estimatedCost);
  const marginPercent = totalAmount > 0 ? Math.round((estimatedProfit / totalAmount) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert("Укажите имя заказчика");
      return;
    }
    if (items.length === 0) {
      alert("Добавьте хотя бы одну позицию изделия");
      return;
    }
    if (totalAmount === 0) {
      alert("Укажите размеры изделия (ширину и высоту), чтобы рассчитать стоимость наряда.");
      return;
    }

    try {
      setIsSubmitting(true);
      const fullDeadline = deadlineDate ? new Date(`${deadlineDate}T${deadlineTime || "18:00"}:00`) : null;

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: {
            id: selectedClientId,
            name: clientName.trim(),
            phone: clientPhone.trim(),
            company: clientCompany.trim(),
          },
          title: orderTitle.trim() || items[0].title,
          assignedToId: assignedToId || null,
          priority,
          deadline: fullDeadline,
          installAddress: installAddress.trim() || null,
          notes: notes.trim() || null,
          previewUrl,
          items,
          totalAmount,
          advanceAmount,
          paymentMethod,
        }),
      });

      if (!res.ok) throw new Error("Ошибка создания наряда");
      const created = await res.json();
      router.push(`/orders/${created.id}`);
    } catch (e) {
      console.error(e);
      alert("Не удалось сохранить наряд");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryChips = [
    { type: "BANNER" as const, label: "Баннер", icon: "🖨️", master: "Альберт", desc: "30 000 / 50 000 сум" },
    { type: "LETTERS" as const, label: "Буквы LED", icon: "💡", master: "Абзал", desc: "от 6 500 сум/см" },
    { type: "LIGHTBOX" as const, label: "Лайтбокс", icon: "📦", master: "Короб", desc: "750 000 сум/м²" },
    { type: "ORACAL" as const, label: "Оракал", icon: "🎨", master: "Пленка", desc: "50 000 сум/м²" },
    { type: "AUTO_BRANDING" as const, label: "Авто", icon: "🚐", master: "Damas/Labo", desc: "650 000 сум" },
    { type: "STAND" as const, label: "Стенд", icon: "📋", master: "ПВХ", desc: "350 000 сум/м²" },
    { type: "INSTALL" as const, label: "Монтаж", icon: "🛠️", master: "Выезд", desc: "150 000 сум" },
    { type: "CUSTOM" as const, label: "Своя услуга", icon: "✨", master: "Вручную", desc: "Свободная цена" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pb-8">
      {/* 1. ПАНЕЛЬ ЗАКАЗЧИКА И ДЕДЛАЙНА В ОДНУ СТРОКУ */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 items-end">
          {/* Имя заказчика с быстрым поиском */}
          <div className="relative col-span-2 sm:col-span-1 lg:col-span-2" ref={clientDropdownRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Заказчик *
              </label>
              {selectedClientId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientId(null);
                    setClientName("");
                    setClientPhone("");
                    setClientCompany("");
                  }}
                  className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" /> Очистить
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Имя клиента (например: Рустам ака)"
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  setSelectedClientId(null);
                  setShowClientDropdown(true);
                }}
                onFocus={() => setShowClientDropdown(true)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none font-semibold text-slate-900 transition"
              />
              {showClientDropdown && clientName && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="p-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3">
                    Существующие клиенты:
                  </div>
                  {existingClients
                    .filter((c) => 
                      c.name.toLowerCase().includes(clientName.toLowerCase()) ||
                      (c.company && c.company.toLowerCase().includes(clientName.toLowerCase())) ||
                      (c.phone && c.phone.includes(clientName))
                    )
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClientId(c.id);
                          setClientName(c.name);
                          setClientPhone(c.phone || "");
                          setClientCompany(c.company || "");
                          setShowClientDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50/70 transition flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-blue-600">{c.name}</div>
                          <div className="text-[10px] text-slate-500">{c.company ? `${c.company} • ` : ""}{c.phone || "Без телефона"}</div>
                        </div>
                        <span className="text-[11px] text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition">
                          Выбрать →
                        </span>
                      </button>
                    ))}
                  {existingClients.filter((c) => c.name.toLowerCase().includes(clientName.toLowerCase())).length === 0 && (
                    <div className="p-3 text-xs text-slate-500 text-center">
                      Новый клиент: <b className="text-slate-800">«{clientName}»</b> (сохранится автоматически)
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Телефон */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Телефон
            </label>
            <input
              type="text"
              placeholder="+998 90 000 00 00"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none font-mono transition"
            />
          </div>

          {/* Организация */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Организация
            </label>
            <input
              type="text"
              placeholder="Кафе / Аптека / Магазин"
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
            />
          </div>

          {/* Мастер цеха */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Мастер цеха
            </label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none font-bold text-slate-800 cursor-pointer transition"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.roleTitle})
                </option>
              ))}
            </select>
          </div>

          {/* Дедлайн */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
              <span>Срок сдачи</span>
              <span className="font-mono text-slate-400 font-semibold">{deadlineTime}</span>
            </label>
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:bg-white focus:border-blue-600 focus:outline-none transition"
            />
          </div>

          {/* Приоритет */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Приоритет
            </label>
            <button
              type="button"
              onClick={() => setPriority(priority === "NORMAL" ? "URGENT" : "NORMAL")}
              className={cn(
                "w-full py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition active:scale-95",
                priority === "URGENT"
                  ? "bg-red-50 text-red-600 border-red-300 shadow-2xs font-black"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              )}
            >
              <Flame className={cn("w-3.5 h-3.5", priority === "URGENT" ? "text-red-500 fill-red-500 animate-bounce" : "text-slate-400")} />
              <span>{priority === "URGENT" ? "🔥 Срочно" : "Обычный"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. РАБОЧАЯ ЗОНА: СЛЕВА ПОЗИЦИИ, СПРАВА ИТОГО И КАССА */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* ЛЕВАЯ КОЛОНКА (8 колонок): КНОПКИ ВЫБОРА И КАРТОЧКИ ПОЗИЦИЙ */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {/* Быстрые кнопки добавления изделия */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/90 shadow-xs flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 shrink-0">
              Добавить:
            </span>
            {categoryChips.map((chip) => (
              <button
                key={chip.type}
                type="button"
                onClick={() => addItem(chip.type)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/70 transition text-xs font-bold text-slate-700 shrink-0 group active:scale-95 shadow-2xs"
              >
                <span className="text-sm">{chip.icon}</span>
                <span>{chip.label}</span>
                <span className="text-[9px] text-slate-400 group-hover:text-blue-600 font-normal">
                  ({chip.master})
                </span>
              </button>
            ))}
          </div>

          {/* Список позиций наряда */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                Позиции рекламного наряда
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                Позиций: {items.length}
              </span>
            </div>

            {items.map((item, idx) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-3 transition hover:border-slate-300 hover:shadow-2xs"
              >
                {/* Шапка строки: номер, наименование, сумма, удалить */}
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateItem(item.id, { title: e.target.value })}
                      placeholder="Наименование изделия"
                      className="font-bold text-xs text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-blue-600 focus:outline-none px-1 py-0.5 flex-1 min-w-0"
                    />

                    {/* Интерактивная галочка возле заголовка баннера */}
                    {item.serviceType === "BANNER" && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextFrame = !item.hasFrame;
                          updateItem(item.id, {
                            hasFrame: nextFrame,
                            unitPrice: nextFrame ? 50000 : 30000,
                            title: nextFrame ? "Широкоформатный баннер (с каркасом)" : "Широкоформатный баннер (печать)",
                            options: nextFrame
                              ? "Металлокаркас из профильной трубы 20×20, натяжка, люверсы"
                              : "Люверсы по периметру 30 см, проклейка",
                          });
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition shrink-0 select-none shadow-2xs active:scale-95",
                          item.hasFrame
                            ? "bg-amber-500 text-white border-amber-600 shadow-amber-500/20"
                            : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                        )}
                      >
                        <span className={cn(
                          "w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] border",
                          item.hasFrame ? "bg-white text-amber-600 border-white" : "border-slate-400 text-transparent"
                        )}>
                          ✓
                        </span>
                        <span>🏗️ С каркасом</span>
                        <span className={cn(
                          "text-[10px] font-mono px-1 py-0.2 rounded font-black",
                          item.hasFrame ? "bg-amber-700 text-amber-100" : "bg-slate-100 text-slate-800"
                        )}>
                          50 000 / м²
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-sm font-mono font-black text-blue-700">
                      {formatCurrency(item.totalPrice)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="Удалить позицию"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Параметры изделия в зависимости от типа */}
                {item.serviceType === "BANNER" ? (
                  <div className="space-y-3">
                    {/* КАРТОЧКА ПЕРЕКЛЮЧЕНИЯ РЕЖИМА БАННЕРА: БЕЗ КАРКАСА (30k) ИЛИ С КАРКАСОМ (50k) */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <span>🎯</span>
                          <span>Тип изготовления баннера:</span>
                        </span>
                        <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          Текущий тариф: {formatCurrency(item.unitPrice)} / м²
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* 1. БЕЗ КАРКАСА */}
                        <button
                          type="button"
                          onClick={() => {
                            updateItem(item.id, {
                              hasFrame: false,
                              unitPrice: 30000,
                              title: "Широкоформатный баннер (печать)",
                              options: "Люверсы по периметру 30 см, проклейка",
                            });
                          }}
                          className={cn(
                            "flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all relative active:scale-98",
                            !item.hasFrame
                              ? "bg-blue-50/50 border-blue-600 shadow-xs ring-2 ring-blue-600/20 text-slate-900"
                              : "bg-white/80 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs transition",
                            !item.hasFrame ? "bg-blue-600 text-white" : "border border-slate-300 text-transparent"
                          )}>
                            ✓
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900">🖨️ Без каркаса (печать)</span>
                              <span className="font-black font-mono text-xs text-blue-600">30 000 UZS/м²</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                              Широкоформатная печать, люверсы 30 см, усиление края проклейкой
                            </p>
                          </div>
                        </button>

                        {/* 2. С МЕТАЛЛИЧЕСКИМ КАРКАСОМ */}
                        <button
                          type="button"
                          onClick={() => {
                            updateItem(item.id, {
                              hasFrame: true,
                              unitPrice: 50000,
                              title: "Широкоформатный баннер (с каркасом)",
                              options: "Металлокаркас из профильной трубы 20×20, натяжка, люверсы",
                            });
                          }}
                          className={cn(
                            "flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all relative active:scale-98",
                            item.hasFrame
                              ? "bg-amber-50/50 border-amber-500 shadow-xs ring-2 ring-amber-500/20 text-slate-900"
                              : "bg-white/80 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs transition",
                            item.hasFrame ? "bg-amber-600 text-white" : "border border-slate-300 text-transparent"
                          )}>
                            ✓
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900">🏗️ С металлическим каркасом</span>
                              <span className="font-black font-mono text-xs text-amber-700">50 000 UZS/м²</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                              Сварка каркаса из трубы 20×20, натяжка полотна, монтажная готовность
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Размеры и расчет площади */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Ширина (м)
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          placeholder="0.00"
                          value={item.width ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateItem(item.id, { width: val === "" ? undefined : parseFloat(val) });
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs focus:border-blue-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Высота (м)
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          placeholder="0.00"
                          value={item.height ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateItem(item.id, { height: val === "" ? undefined : parseFloat(val) });
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs focus:border-blue-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Площадь & Тариф / м²
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-1.5 bg-slate-200 rounded-lg font-mono font-black text-slate-800 text-xs shrink-0">
                            {item.area || 0} м²
                          </span>
                          <input
                            type="number"
                            step="1000"
                            value={item.unitPrice ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateItem(item.id, { unitPrice: val === "" ? 0 : Number(val) });
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Опции для Альберта
                        </label>
                        <input
                          type="text"
                          placeholder="Люверсы 30 см, проклейка"
                          value={item.options || ""}
                          onChange={(e) => updateItem(item.id, { options: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : item.serviceType === "LETTERS" ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Текст вывески ({item.letterCount || 0} симв.)
                        </label>
                        <input
                          type="text"
                          placeholder="Например: АПТЕКА 24/7"
                          value={item.letterText || ""}
                          onChange={(e) => updateItem(item.id, { letterText: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-xs focus:border-blue-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Высота буквы (см)
                        </label>
                        <input
                          type="number"
                          placeholder="25"
                          value={item.letterHeight ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateItem(item.id, { letterHeight: val === "" ? undefined : Number(val) });
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs focus:border-blue-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Ставка / см
                        </label>
                        <input
                          type="number"
                          step="500"
                          value={item.unitPrice ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateItem(item.id, { unitPrice: val === "" ? 0 : Number(val) });
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Быстрый выбор типа подсветки букв */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1">
                      <span className="text-slate-400 font-semibold mr-0.5">Тип свечения:</span>
                      {[
                        { label: "Лицевая (акрил)", price: 6500, desc: "Светорассеивающий акрил, светодиоды LED 1.2W" },
                        { label: "Контражур", price: 7000, desc: "Контражурная подсветка, дистанционные держатели" },
                        { label: "Лицо + Контражур", price: 8500, desc: "Двойное свечение (акрил лицо + свет назад)" },
                        { label: "Без света", price: 4000, desc: "ПВХ пластик с покраской/пленкой без диодов" },
                        { label: "LED неон", price: 5500, desc: "Силиконовый гибкий неон на подложке" },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => updateItem(item.id, { unitPrice: opt.price, options: opt.desc })}
                          className={cn(
                            "px-2 py-0.5 rounded-lg border transition font-medium text-xs",
                            item.unitPrice === opt.price
                              ? "bg-blue-50 border-blue-500 text-blue-800 font-bold shadow-2xs"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : ["LIGHTBOX", "ORACAL", "STAND"].includes(item.serviceType) ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Ширина (м)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        placeholder="0.00"
                        value={item.width ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateItem(item.id, { width: val === "" ? undefined : parseFloat(val) });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Высота (м)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        placeholder="0.00"
                        value={item.height ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateItem(item.id, { height: val === "" ? undefined : parseFloat(val) });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Площадь & Тариф / м²
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-1.5 bg-slate-200 rounded-lg font-mono font-black text-slate-800 text-xs shrink-0">
                          {item.area || 0} м²
                        </span>
                        <input
                          type="number"
                          step="5000"
                          value={item.unitPrice ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateItem(item.id, { unitPrice: val === "" ? 0 : Number(val) });
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Опции цеха
                      </label>
                      <input
                        type="text"
                        placeholder="Комплектация"
                        value={item.options || ""}
                        onChange={(e) => updateItem(item.id, { options: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Количество</label>
                      <input
                        type="number"
                        value={item.quantity ?? 1}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateItem(item.id, { quantity: val === "" ? 1 : Number(val) });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Тариф (UZS)</label>
                      <input
                        type="number"
                        step="5000"
                        value={item.unitPrice ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateItem(item.id, { unitPrice: val === "" ? 0 : Number(val) });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Примечание</label>
                      <input
                        type="text"
                        placeholder="Особенности монтажа/работ"
                        value={item.options || ""}
                        onChange={(e) => updateItem(item.id, { options: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА (4 колонки): СВОДКА, ОПЛАТА, МАКЕТ И КНОПКА ЗАПУСКА */}
        <div className="lg:col-span-4 space-y-3">
          {/* Финансовая карточка */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Итоговая сумма заказа
              </span>
              <div className="text-3xl font-black font-mono text-slate-900 leading-tight mt-0.5">
                {formatCurrency(totalAmount)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                <label className="text-[10px] text-emerald-800 font-bold block uppercase">
                  Аванс (в кассу):
                </label>
                <input
                  type="number"
                  step="10000"
                  placeholder="0"
                  value={advanceAmount === 0 ? "" : advanceAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAdvanceAmount(val === "" ? 0 : Number(val));
                  }}
                  className="w-full mt-1 px-2.5 py-1 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-emerald-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-800 font-bold block uppercase">
                  Остаток долга:
                </span>
                <span className="text-sm font-black font-mono text-amber-900 block mt-1.5 truncate">
                  {formatCurrency(debtAmount)}
                </span>
              </div>
            </div>

            {/* Способ оплаты */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Способ оплаты
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(["CASH", "CARD", "TRANSFER"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={cn(
                      "text-xs py-1.5 px-2 rounded-lg font-bold border transition text-center",
                      paymentMethod === m
                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {m === "CASH" ? "Наличные" : m === "CARD" ? "Click / Карта" : "Безнал"}
                  </button>
                ))}
              </div>
            </div>

            {/* Компактный индикатор маржи */}
            {totalAmount > 0 && (
              <div className="p-2.5 bg-slate-900 text-white rounded-xl text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Себестоимость:</span>
                  <span className="font-mono text-rose-300">~{formatCurrency(estimatedCost)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-xs">
                  <span className="text-emerald-400">Маржа:</span>
                  <span className="font-mono text-emerald-400">
                    +{formatCurrency(estimatedProfit)} ({marginPercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      marginPercent >= 50 ? "bg-emerald-500" : marginPercent >= 30 ? "bg-amber-500" : "bg-rose-500"
                    )}
                    style={{ width: `${Math.min(100, marginPercent)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Компактный блок макета */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                Эскиз / Чертеж для цеха
              </span>
              {previewUrl && (
                <button
                  type="button"
                  onClick={() => setPreviewUrl(null)}
                  className="text-[10px] text-red-500 hover:underline font-bold"
                >
                  Удалить
                </button>
              )}
            </div>

            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-28">
                <img src={previewUrl} alt="Эскиз изделия" className="w-full h-28 object-cover" />
              </div>
            ) : (
              <label className="cursor-pointer flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 transition">
                <FileImage className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">Прикрепить фото / эскиз</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Адрес монтажа и примечание */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Адрес монтажа (ул. Навои, 15)"
                value={installAddress}
                onChange={(e) => setInstallAddress(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
              />
            </div>
            <input
              type="text"
              placeholder="Пометки для мастера (например: саморезы 75мм)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
            />
          </div>

          {/* ГЛАВНАЯ КНОПКА ЗАПУСКА НА СТОЛЕ */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? "Отправка в цех..." : "Оформить наряд в цех"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  );
}
