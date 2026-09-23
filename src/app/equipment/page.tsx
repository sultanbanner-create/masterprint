"use client";

import React, { useState, useEffect } from "react";
import { 
  Wrench, 
  Droplet, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Truck, 
  Cpu, 
  Printer, 
  Scissors, 
  Flame, 
  Calendar,
  DollarSign,
  User,
  History,
  RotateCw,
  Sliders
} from "lucide-react";

interface EquipmentLog {
  id: string;
  action: string;
  performedBy: string;
  cost: number;
  notes?: string | null;
  createdAt: string;
}

interface Equipment {
  id: string;
  name: string;
  type: "PRINTER" | "CNC" | "PLOTTER" | "WELDING" | "VEHICLE" | string;
  status: "OK" | "WARNING" | "REPAIR" | string;
  assignedToName?: string | null;
  cyanLevel?: number | null;
  magentaLevel?: number | null;
  yellowLevel?: number | null;
  blackLevel?: number | null;
  lastServiceDate?: string | null;
  nextServiceDate?: string | null;
  notes?: string | null;
  logs: EquipmentLog[];
}

export default function EquipmentPage() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState<Equipment | null>(null);

  // Модальные окна
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Форма добавления ТО / доливки чернил
  const [logAction, setLogAction] = useState("");
  const [logPerformedBy, setLogPerformedBy] = useState("Альберт");
  const [logCost, setLogCost] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [inkC, setInkC] = useState(100);
  const [inkM, setInkM] = useState(100);
  const [inkY, setInkY] = useState(100);
  const [inkK, setInkK] = useState(100);
  const [includeInk, setIncludeInk] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Форма добавления нового оборудования
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("PRINTER");
  const [newAssigned, setNewAssigned] = useState("Альберт");
  const [newNotes, setNewNotes] = useState("");

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/equipment");
      if (res.ok) {
        const data = await res.json();
        setEquipmentList(data.equipment || []);
      }
    } catch (err) {
      console.error("Failed to load equipment", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const openLogModal = (machine: Equipment, defaultAction = "Плановое ТО") => {
    setSelectedMachine(machine);
    setLogAction(defaultAction);
    setLogPerformedBy(machine.assignedToName || "Альберт");
    setLogCost("");
    setLogNotes("");
    if (machine.type === "PRINTER") {
      setInkC(machine.cyanLevel ?? 100);
      setInkM(machine.magentaLevel ?? 100);
      setInkY(machine.yellowLevel ?? 100);
      setInkK(machine.blackLevel ?? 100);
      setIncludeInk(defaultAction.toLowerCase().includes("чернил"));
    } else {
      setIncludeInk(false);
    }
    setIsLogModalOpen(true);
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine) return;
    setSubmitting(true);

    try {
      const payload: any = {
        actionType: "LOG",
        equipmentId: selectedMachine.id,
        action: logAction,
        performedBy: logPerformedBy,
        cost: Number(logCost) || 0,
        notes: logNotes || null,
      };

      if (selectedMachine.type === "PRINTER" && includeInk) {
        payload.inkUpdates = {
          cyanLevel: inkC,
          magentaLevel: inkM,
          yellowLevel: inkY,
          blackLevel: inkK,
        };
      }

      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsLogModalOpen(false);
        fetchEquipment();
      }
    } catch (err) {
      console.error("Error saving log", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          type: newType,
          assignedToName: newAssigned,
          notes: newNotes,
        }),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setNewName("");
        setNewNotes("");
        fetchEquipment();
      }
    } catch (err) {
      console.error("Error adding equipment", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickRefillInk = async (machine: Equipment, color: "C" | "M" | "Y" | "K") => {
    const update: any = { id: machine.id };
    if (color === "C") update.cyanLevel = 100;
    if (color === "M") update.magentaLevel = 100;
    if (color === "Y") update.yellowLevel = 100;
    if (color === "K") update.blackLevel = 100;

    // Также запишем в лог
    try {
      await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "LOG",
          equipmentId: machine.id,
          action: `Доливка чернил ${color === "C" ? "Cyan (Голубой)" : color === "M" ? "Magenta (Пурпурный)" : color === "Y" ? "Yellow (Желтый)" : "Black (Черный)"} до 100%`,
          performedBy: machine.assignedToName || "Альберт",
          cost: 150000,
          notes: "Заправка сольвентных чернил 1 литр",
          inkUpdates: {
            cyanLevel: color === "C" ? 100 : machine.cyanLevel,
            magentaLevel: color === "M" ? 100 : machine.magentaLevel,
            yellowLevel: color === "Y" ? 100 : machine.yellowLevel,
            blackLevel: color === "K" ? 100 : machine.blackLevel,
          },
        }),
      });
      fetchEquipment();
    } catch (err) {
      console.error("Failed to refill ink", err);
    }
  };

  const handleToggleStatus = async (machine: Equipment) => {
    const nextStatus = machine.status === "OK" ? "WARNING" : machine.status === "WARNING" ? "REPAIR" : "OK";
    try {
      await fetch("/api/equipment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: machine.id,
          status: nextStatus,
        }),
      });
      fetchEquipment();
    } catch (err) {
      console.error("Failed to toggle status", err);
    }
  };

  const getMachineIcon = (type: string) => {
    switch (type) {
      case "PRINTER":
        return <Printer className="w-5 h-5 text-purple-600" />;
      case "CNC":
        return <Cpu className="w-5 h-5 text-blue-600" />;
      case "PLOTTER":
        return <Scissors className="w-5 h-5 text-emerald-600" />;
      case "WELDING":
        return <Flame className="w-5 h-5 text-orange-600" />;
      case "VEHICLE":
        return <Truck className="w-5 h-5 text-teal-600" />;
      default:
        return <Wrench className="w-5 h-5 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OK":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Исправен
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Требует ТО / Чернил
          </span>
        );
      case "REPAIR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> В ремонте
          </span>
        );
      default:
        return null;
    }
  };

  const totalMachines = equipmentList.length;
  const warningCount = equipmentList.filter((e) => e.status !== "OK").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl text-white shadow-md shadow-teal-500/20">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Станки & Оборудование цеха
              </h1>
              <p className="text-sm text-slate-500">
                Контроль широкоформатного принтера, ЧПУ фрезера, плоттера, уровня чернил CMYK и регламентного ТО
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <Plus className="w-4 h-4" /> Добавить станок
          </button>
          <button
            onClick={fetchEquipment}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
            title="Обновить"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Всего единиц парка</div>
            <div className="text-xl font-black text-slate-900">{totalMachines} станков</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">В строю & исправно</div>
            <div className="text-xl font-black text-emerald-600">
              {equipmentList.filter((e) => e.status === "OK").length} шт
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className={`p-3 rounded-xl ${warningCount > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Требуют внимания / ТО</div>
            <div className={`text-xl font-black ${warningCount > 0 ? "text-amber-600" : "text-slate-900"}`}>
              {warningCount} станков
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Cards List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {equipmentList.map((machine) => (
          <div
            key={machine.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition"
          >
            <div>
              {/* Header card */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    {getMachineIcon(machine.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">
                      {machine.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        <User className="w-3 h-3 text-slate-400" /> {machine.assignedToName || "Мастер не назначен"}
                      </span>
                      {machine.lastServiceDate && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" /> ТО: {new Date(machine.lastServiceDate).toLocaleDateString("ru-RU")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="cursor-pointer" onClick={() => handleToggleStatus(machine)} title="Нажмите, чтобы изменить статус">
                  {getStatusBadge(machine.status)}
                </div>
              </div>

              {machine.notes && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-4">
                  💡 {machine.notes}
                </p>
              )}

              {/* CMYK INK TANKS (FOR WIDE-FORMAT PRINTER) */}
              {machine.type === "PRINTER" && (
                <div className="bg-slate-900 text-white p-4 rounded-xl mb-4 shadow-inner">
                  <div className="flex items-center justify-between mb-3 text-xs font-semibold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Droplet className="w-4 h-4 text-cyan-400" />
                      Уровень сольвентных чернил CMYK
                    </span>
                    <button
                      onClick={() => openLogModal(machine, "Доливка чернил CMYK")}
                      className="text-[11px] text-teal-400 hover:text-teal-300 font-medium underline"
                    >
                      Настроить уровни
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {/* Cyan */}
                    <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 text-center">
                      <div className="text-[11px] font-bold text-cyan-400 mb-1">C (Cyan)</div>
                      <div className="h-16 bg-slate-950 rounded relative flex items-end overflow-hidden mb-1.5">
                        <div
                          className="w-full bg-cyan-400 transition-all duration-500 rounded-b"
                          style={{ height: `${machine.cyanLevel ?? 0}%` }}
                        />
                      </div>
                      <div className="text-xs font-bold">{machine.cyanLevel ?? 0}%</div>
                      <button
                        onClick={() => handleQuickRefillInk(machine, "C")}
                        className="mt-1.5 w-full py-1 text-[10px] font-medium bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 rounded"
                        title="Долить Cyan до 100%"
                      >
                        +100%
                      </button>
                    </div>

                    {/* Magenta */}
                    <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 text-center">
                      <div className="text-[11px] font-bold text-fuchsia-400 mb-1">M (Magenta)</div>
                      <div className="h-16 bg-slate-950 rounded relative flex items-end overflow-hidden mb-1.5">
                        <div
                          className="w-full bg-fuchsia-500 transition-all duration-500 rounded-b"
                          style={{ height: `${machine.magentaLevel ?? 0}%` }}
                        />
                      </div>
                      <div className="text-xs font-bold">{machine.magentaLevel ?? 0}%</div>
                      <button
                        onClick={() => handleQuickRefillInk(machine, "M")}
                        className="mt-1.5 w-full py-1 text-[10px] font-medium bg-fuchsia-500/20 hover:bg-fuchsia-500/40 text-fuchsia-300 rounded"
                        title="Долить Magenta до 100%"
                      >
                        +100%
                      </button>
                    </div>

                    {/* Yellow */}
                    <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 text-center">
                      <div className="text-[11px] font-bold text-yellow-400 mb-1">Y (Yellow)</div>
                      <div className="h-16 bg-slate-950 rounded relative flex items-end overflow-hidden mb-1.5">
                        <div
                          className="w-full bg-yellow-400 transition-all duration-500 rounded-b"
                          style={{ height: `${machine.yellowLevel ?? 0}%` }}
                        />
                      </div>
                      <div className="text-xs font-bold">{machine.yellowLevel ?? 0}%</div>
                      <button
                        onClick={() => handleQuickRefillInk(machine, "Y")}
                        className="mt-1.5 w-full py-1 text-[10px] font-medium bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 rounded"
                        title="Долить Yellow до 100%"
                      >
                        +100%
                      </button>
                    </div>

                    {/* Black */}
                    <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 text-center">
                      <div className="text-[11px] font-bold text-slate-300 mb-1">K (Black)</div>
                      <div className="h-16 bg-slate-950 rounded relative flex items-end overflow-hidden mb-1.5">
                        <div
                          className="w-full bg-slate-400 transition-all duration-500 rounded-b"
                          style={{ height: `${machine.blackLevel ?? 0}%` }}
                        />
                      </div>
                      <div className="text-xs font-bold">{machine.blackLevel ?? 0}%</div>
                      <button
                        onClick={() => handleQuickRefillInk(machine, "K")}
                        className="mt-1.5 w-full py-1 text-[10px] font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded"
                        title="Долить Black до 100%"
                      >
                        +100%
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Maintenance logs snippet */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" /> Последнее обслуживание & ремонт
                  </span>
                </div>

                {machine.logs && machine.logs.length > 0 ? (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {machine.logs.slice(0, 3).map((log) => (
                      <div
                        key={log.id}
                        className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-semibold text-slate-800">{log.action}</span>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>{log.performedBy}</span>
                            <span>•</span>
                            <span>{new Date(log.createdAt).toLocaleDateString("ru-RU")}</span>
                          </div>
                        </div>
                        {log.cost > 0 && (
                          <div className="text-[11px] font-bold text-rose-600 whitespace-nowrap">
                            -{log.cost.toLocaleString()} сум
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Записей обслуживания пока нет</p>
                )}
              </div>
            </div>

            {/* Actions bottom */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                onClick={() => openLogModal(machine, "Плановое ТО")}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 transition flex items-center justify-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5" /> Записать ТО
              </button>
              {machine.type === "PRINTER" && (
                <button
                  onClick={() => openLogModal(machine, "Заправка чернил CMYK")}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 transition flex items-center justify-center gap-1.5"
                >
                  <Droplet className="w-3.5 h-3.5" /> Долить чернила
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Записать ТО / Долить чернила */}
      {isLogModalOpen && selectedMachine && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900">
                  Запись обслуживания: {selectedMachine.name}
                </h3>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Что выполнено (действие) *
                </label>
                <input
                  type="text"
                  required
                  value={logAction}
                  onChange={(e) => setLogAction(e.target.value)}
                  placeholder="Например: Замена фильтров, замена фрезы, доливка чернил"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Кто выполнил *
                  </label>
                  <select
                    value={logPerformedBy}
                    onChange={(e) => setLogPerformedBy(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Альберт">Альберт (Печатник)</option>
                    <option value="Абзал">Абзал (Мастер сборки/ЧПУ)</option>
                    <option value="Жалгас">Жалгас (Дизайнер/Плоттер)</option>
                    <option value="Тимур">Тимур (Директор)</option>
                    <option value="Сервисный инженер">Сервисный мастер со стороны</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Стоимость запчастей/работ (сум)
                  </label>
                  <input
                    type="number"
                    value={logCost}
                    onChange={(e) => setLogCost(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                  </input>
                </div>
              </div>

              {/* Ink levels adjustment for printers */}
              {selectedMachine.type === "PRINTER" && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Droplet className="w-4 h-4 text-cyan-500" /> Обновить уровни чернил (%)
                    </label>
                    <input
                      type="checkbox"
                      checked={includeInk}
                      onChange={(e) => setIncludeInk(e.target.checked)}
                      className="rounded text-teal-600"
                    />
                  </div>

                  {includeInk && (
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      <div>
                        <div className="text-[10px] font-bold text-cyan-600 mb-1">Cyan %</div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={inkC}
                          onChange={(e) => setInkC(Number(e.target.value))}
                          className="w-full text-center text-xs py-1 rounded border border-slate-300"
                        />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-fuchsia-600 mb-1">Magenta %</div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={inkM}
                          onChange={(e) => setInkM(Number(e.target.value))}
                          className="w-full text-center text-xs py-1 rounded border border-slate-300"
                        />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-yellow-600 mb-1">Yellow %</div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={inkY}
                          onChange={(e) => setInkY(Number(e.target.value))}
                          className="w-full text-center text-xs py-1 rounded border border-slate-300"
                        />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-700 mb-1">Black %</div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={inkK}
                          onChange={(e) => setInkK(Number(e.target.value))}
                          className="w-full text-center text-xs py-1 rounded border border-slate-300"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Примечание / Состояние
                </label>
                <textarea
                  rows={2}
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="Дополнительные заметки о состоянии оборудования..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? "Сохранение..." : "Сохранить запись ТО"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Добавить новый станок */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-teal-600" />
                Новый станок или транспорт цеха
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEquipment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Название & модель *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Например: Лазерный СО2 станок 100W"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Тип агрегата *
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="PRINTER">🖨️ Принтер (широкоформатный / интерьерный)</option>
                    <option value="CNC">⚙️ ЧПУ Фрезер / Лазер</option>
                    <option value="PLOTTER">✂️ Режущий плоттер</option>
                    <option value="WELDING">⚡ Сварочное оборудование</option>
                    <option value="VEHICLE">🚚 Автомобиль / Транспорт</option>
                    <option value="OTHER">🛠️ Прочее оборудование</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ответственный мастер
                  </label>
                  <select
                    value={newAssigned}
                    onChange={(e) => setNewAssigned(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Альберт">Альберт (Печатник)</option>
                    <option value="Абзал">Абзал (Мастер сборки)</option>
                    <option value="Жалгас">Жалгас (Дизайнер/Плоттер)</option>
                    <option value="Тимур">Тимур (Директор)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Характеристики / Заметки
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Мощность, тип расходников, регламент ТО..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? "Создание..." : "Добавить в парк"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
