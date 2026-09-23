"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Database, 
  Download, 
  ShieldCheck, 
  Server, 
  FileJson, 
  HardDrive, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  ArrowLeft,
  Clock,
  Layers,
  Users,
  Wallet
} from "lucide-react";

export default function BackupPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // Загрузка статистики системы
    Promise.all([
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/stock").then((r) => r.json()),
      fetch("/api/equipment").then((r) => r.json()),
    ])
      .then(([orders, clients, stock, eq]) => {
        setStats({
          ordersCount: Array.isArray(orders) ? orders.length : 0,
          clientsCount: Array.isArray(clients) ? clients.length : 0,
          stockCount: stock?.materials?.length || 0,
          equipmentCount: eq?.equipment?.length || 0,
        });
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadBackup = (raw: boolean = false) => {
    setDownloading(true);
    const url = raw ? "/api/backup?raw=true" : "/api/backup";
    const a = document.createElement("a");
    a.href = url;
    a.download = raw ? "dev.db" : "backup.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDownloading(false), 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Шапка */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                <Database className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Резервное копирование & Безопасность базы
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Скачивание полной копии данных цеха: наряды, финансы, клиенты, платежи и склад
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          База активна
        </span>
      </div>

      {/* Текущее состояние данных */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 block font-bold uppercase text-[10px]">Заказов в базе:</span>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">
            {loading ? "..." : stats?.ordersCount} шт
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 block font-bold uppercase text-[10px]">Клиентов в CRM:</span>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">
            {loading ? "..." : stats?.clientsCount} чел
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 block font-bold uppercase text-[10px]">Позиций склада:</span>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">
            {loading ? "..." : stats?.stockCount} поз
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 block font-bold uppercase text-[10px]">Станков в парке:</span>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">
            {loading ? "..." : stats?.equipmentCount} ед
          </div>
        </div>
      </div>

      {/* Варианты экспорта */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Экспорт JSON */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <FileJson className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">
              Полный структурированный архив (.json)
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Включает все таблицы: наряды, сметы, историю оплат, складские списания, комментарии мастеров и журнал ТО станков в универсальном формате JSON.
            </p>
          </div>

          <button
            onClick={() => handleDownloadBackup(false)}
            disabled={downloading}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? "Формирование..." : "Скачать бэкап JSON"}</span>
          </button>
        </div>

        {/* Экспорт сырого SQLite файла */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <HardDrive className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">
              Сырой файл базы данных SQLite (.db)
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Прямая бинарная копия рабочего файла <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">dev.db</code>. Позволяет мгновенно развернуть систему на любом новом сервере или компьютере без конвертации.
            </p>
          </div>

          <button
            onClick={() => handleDownloadBackup(true)}
            disabled={downloading}
            className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? "Скачивание..." : "Скачать файл dev.db"}</span>
          </button>
        </div>
      </div>

      {/* Рекомендации по безопасности данных */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl border border-slate-700 shadow-md space-y-3">
        <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-400" />
          Рекомендация для директора (Тимур):
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Рекомендуется скачивать резервную копию базы данных <b>раз в неделю</b> (например, каждую субботу перед выплатой зарплат) и сохранять её на отдельную флешку или в личный облачный диск (Google Drive / Telegram Избранное). В случае выхода из строя рабочего компьютера или переустановки Windows все ваши финансовые записи, должники и наряды будут в полной безопасности.
        </p>
      </div>
    </div>
  );
}
