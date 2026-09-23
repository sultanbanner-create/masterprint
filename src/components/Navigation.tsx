"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ClipboardList, 
  KanbanSquare, 
  Users, 
  Wallet, 
  PlusCircle, 
  Layers, 
  Sparkles, 
  UserCheck, 
  Warehouse, 
  Banknote, 
  Send, 
  Wrench, 
  Database, 
  BarChart3, 
  Calendar,
  Search,
  QrCode,
  Calculator,
  Sliders
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobalSearchModal } from "@/components/GlobalSearchModal";
import { QRScannerModal } from "@/components/QRScannerModal";

export function Navigation() {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navItems = [
    {
      href: "/",
      label: "Дашборд",
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      href: "/orders",
      label: "Реестр заказов",
      icon: ClipboardList,
      active: pathname.startsWith("/orders") && pathname !== "/orders/new" && pathname !== "/orders/kanban",
    },
    {
      href: "/orders/kanban",
      label: "Канбан цеха",
      icon: KanbanSquare,
      active: pathname === "/orders/kanban",
    },
    {
      href: "/calendar",
      label: "Календарь",
      icon: Calendar,
      active: pathname.startsWith("/calendar"),
    },
    {
      href: "/calculator",
      label: "Калькулятор ТЗ",
      icon: Calculator,
      active: pathname === "/calculator",
    },
    {
      href: "/orders/new",
      label: "+ Новый наряд",
      icon: PlusCircle,
      active: pathname === "/orders/new",
      isPrimary: true,
    },
    {
      href: "/clients",
      label: "Клиенты",
      icon: Users,
      active: pathname.startsWith("/clients"),
    },
    {
      href: "/finance",
      label: "Касса & Долги",
      icon: Wallet,
      active: pathname.startsWith("/finance"),
    },
    {
      href: "/warehouse",
      label: "Склад",
      icon: Warehouse,
      active: pathname.startsWith("/warehouse"),
    },
    {
      href: "/payroll",
      label: "Зарплаты",
      icon: Banknote,
      active: pathname.startsWith("/payroll"),
    },
    {
      href: "/reports",
      label: "Отчеты & KPI",
      icon: BarChart3,
      active: pathname.startsWith("/reports"),
    },
    {
      href: "/settings/services",
      label: "Конструктор услуг",
      icon: Sliders,
      active: pathname.startsWith("/settings/services"),
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand: Master Print */}
          <Link href="/" className="flex items-center gap-3 group">
            <img 
              src="/logo.png" 
              alt="Master Print" 
              className="w-10 h-10 rounded-xl object-cover shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform" 
            />
            <div>
              <span className="font-black text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                MASTER <span className="text-blue-600">PRINT</span>
              </span>
              <p className="text-[11px] text-slate-500 font-medium -mt-0.5">
                Рекламное агентство & Производство
              </p>
            </div>
          </Link>

          {/* Команда (4 бейджа) */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Команда:</span>
            <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700" title="Директор">
              Тимур
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 font-bold text-blue-700" title="Продажи & Дизайн">
              Жалгас
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-orange-50 border border-orange-200 font-bold text-orange-700" title="Сборка & Монтаж">
              Абзал
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-purple-50 border border-purple-200 font-bold text-purple-700" title="Печать баннеров">
              Альберт
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.isPrimary) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/30 transition-all hover:shadow"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors",
                    item.active
                      ? "bg-teal-50 text-teal-700 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Быстрый поиск Ctrl+K */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="ml-2 px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition border border-slate-200 flex items-center gap-1.5 text-xs font-medium"
              title="Глобальный поиск по базе нарядов, клиентов и склада (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden lg:inline text-slate-500">Поиск...</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-bold text-slate-400 bg-white border border-slate-200 rounded">
                Ctrl+K
              </kbd>
            </button>

            {/* QR Сканер наряда */}
            <button
              onClick={() => setIsQRScannerOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition border border-transparent hover:border-teal-100"
              title="Сканировать QR-код с бумажного наряда цеха"
            >
              <QrCode className="w-4 h-4" />
            </button>

            <Link
              href="/settings/telegram"
              className="p-2 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition border border-transparent hover:border-blue-100"
              title="Настройка Telegram-бота цеха"
            >
              <Send className="w-4 h-4" />
            </Link>

            <Link
              href="/settings/backup"
              className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition border border-transparent hover:border-teal-100"
              title="Резервное копирование базы данных"
            >
              <Database className="w-4 h-4" />
            </Link>
          </nav>

          {/* Mobile fast actions */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200"
              title="Поиск"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsQRScannerOpen(true)}
              className="p-2 rounded-xl bg-slate-100 text-teal-600 border border-slate-200"
              title="Сканер QR"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <Link
              href="/orders/new"
              className="p-2 rounded-xl bg-teal-600 text-white shadow-sm"
              title="Создать наряд"
            >
              <PlusCircle className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-1.5 flex items-center gap-1 overflow-x-auto shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors shrink-0 min-w-[58px]",
                item.active 
                  ? "text-teal-700 bg-teal-50 font-bold" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Icon className={cn("w-4 h-4", item.active ? "text-teal-600" : "text-slate-400")} />
              <span className="truncate max-w-[64px] text-center">{item.label.replace("+ ", "")}</span>
            </Link>
          );
        })}
      </div>

      {/* Модальное окно глобального поиска (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Модальное окно сканера QR-кода наряда */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
      />
    </header>
  );
}
