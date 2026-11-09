"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calculator,
  Plus,
  KanbanSquare,
  ClipboardList,
  Calendar,
  Wallet,
  Users,
  Banknote,
  Warehouse,
  BarChart3,
  Sliders,
  Send,
  Database,
  Search,
  QrCode,
  Menu,
  X,
  Layers,
  ChevronLeft,
  PanelLeftOpen,
  LogOut,
  Package,
  KeyRound,
  Receipt,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobalSearchModal } from "@/components/GlobalSearchModal";
import { QRScannerModal } from "@/components/QRScannerModal";
import { DeadlineNotificationCenter } from "@/components/DeadlineNotificationCenter";

interface AppLayoutProps {
  children: React.ReactNode;
}

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (p: string) => boolean;
};
type NavGroup = { group: string; items: NavItem[] };

const isOrdersRegistry = (p: string) =>
  p.startsWith("/orders") && p !== "/orders/new" && p !== "/orders/kanban";

// Все разделы системы
const ALL: Record<string, NavItem> = {
  dashboard: { href: "/", label: "Главная", icon: LayoutDashboard, match: (p) => p === "/" },
  calculator: { href: "/calculator", label: "Калькулятор", icon: Calculator, match: (p) => p === "/calculator" },
  kanban: { href: "/orders/kanban", label: "Канбан цеха", icon: KanbanSquare, match: (p) => p === "/orders/kanban" },
  orders: { href: "/orders", label: "Заказы", icon: ClipboardList, match: isOrdersRegistry },
  calendar: { href: "/calendar", label: "Календарь", icon: Calendar, match: (p) => p.startsWith("/calendar") },
  finance: { href: "/finance", label: "Касса и долги", icon: Wallet, match: (p) => p.startsWith("/finance") },
  expenses: { href: "/expenses", label: "Расходы цеха", icon: Receipt, match: (p) => p.startsWith("/expenses") },
  clients: { href: "/clients", label: "Клиенты", icon: Users, match: (p) => p.startsWith("/clients") },
  payroll: { href: "/payroll", label: "Зарплаты", icon: Banknote, match: (p) => p.startsWith("/payroll") },
  warehouse: { href: "/warehouse", label: "Склад", icon: Warehouse, match: (p) => p.startsWith("/warehouse") },
  equipment: { href: "/equipment", label: "Станки", icon: Wrench, match: (p) => p.startsWith("/equipment") },
  boxes: { href: "/production/nukus-boxes", label: "Коробки Нукус", icon: Package, match: (p) => p.startsWith("/production/nukus-boxes") },
  services: { href: "/settings/services", label: "Услуги и тарифы", icon: Sliders, match: (p) => p.startsWith("/settings/services") },
  reports: { href: "/reports", label: "Отчёты", icon: BarChart3, match: (p) => p.startsWith("/reports") },
  pricing: { href: "/settings/pricing", label: "Прайс-листы", icon: Layers, match: (p) => p.startsWith("/settings/pricing") },
  telegram: { href: "/settings/telegram", label: "Telegram-бот", icon: Send, match: (p) => p.startsWith("/settings/telegram") },
  backup: { href: "/settings/backup", label: "Резервные копии", icon: Database, match: (p) => p.startsWith("/settings/backup") },
  security: { href: "/settings/security", label: "Пароль и вход", icon: KeyRound, match: (p) => p.startsWith("/settings/security") },
};

function navForRole(role: string | undefined): NavGroup[] {
  if (role === "WORKSHOP_ASSEMBLY" || role === "WORKSHOP_PRINTING") {
    return [
      { group: "Цех", items: [ALL.dashboard, ALL.kanban, ALL.orders, ALL.calendar, ALL.boxes] },
      { group: "Склад и станки", items: [ALL.warehouse, ALL.equipment] },
      { group: "Аккаунт", items: [ALL.security] },
    ];
  }
  if (role === "SALES_DESIGNER") {
    return [
      { group: "Работа", items: [ALL.dashboard, ALL.calculator, ALL.kanban, ALL.orders, ALL.calendar] },
      { group: "Клиенты", items: [ALL.clients] },
      { group: "Цех", items: [ALL.warehouse, ALL.boxes] },
      { group: "Настройки", items: [ALL.telegram, ALL.security] },
    ];
  }
  // Директор: полный доступ
  return [
    { group: "Работа", items: [ALL.dashboard, ALL.calculator, ALL.kanban, ALL.orders, ALL.calendar] },
    { group: "Деньги и клиенты", items: [ALL.finance, ALL.expenses, ALL.clients, ALL.payroll] },
    { group: "Цех и склад", items: [ALL.warehouse, ALL.equipment, ALL.boxes] },
    { group: "Отчёты и настройки", items: [ALL.reports, ALL.services, ALL.pricing, ALL.telegram, ALL.backup, ALL.security] },
  ];
}

function pageTitle(pathname: string): string {
  if (pathname === "/") return "Главная";
  if (pathname === "/orders/new") return "Новый наряд";
  if (pathname === "/orders/kanban") return "Канбан цеха";
  if (pathname === "/orders") return "Заказы";
  if (pathname.startsWith("/orders/")) return "Карточка наряда";
  if (pathname.startsWith("/clients/")) return "Карточка клиента";
  const hit = Object.values(ALL).find((i) => i.href !== "/" && i.match(pathname));
  if (hit) return hit.label;
  if (pathname.startsWith("/tools/led-calc")) return "Расчёт подсветки";
  return "Master Print";
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname() || "/";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("masterprint_sidebar_collapsed");
      if (saved !== null) setIsCollapsed(saved === "true");
    } catch {}
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("masterprint_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Профиль загружаем один раз, а не на каждой смене страницы
  useEffect(() => {
    if (pathname.startsWith("/login") || pathname.startsWith("/tma") || pathname.startsWith("/track")) return;
    if (userLoaded) return;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {})
      .finally(() => setUserLoaded(true));
  }, [pathname, userLoaded]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

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

  const role: string | undefined = currentUser?.role;
  const navGroups = useMemo(() => navForRole(role), [role]);
  const canCreateOrder = Boolean(currentUser) && role !== "WORKSHOP_PRINTING";

  // Нижняя панель на телефоне: самые частые разделы
  const bottomItems = useMemo<(NavItem | "new" | "more")[]>(() => {
    if (role === "WORKSHOP_PRINTING") return [ALL.dashboard, ALL.orders, ALL.kanban, ALL.calendar, "more"];
    return [ALL.dashboard, ALL.orders, "new", ALL.kanban, "more"];
  }, [role]);

  // Вход, мини-приложение Telegram и трекер клиента — без оболочки
  if (pathname.startsWith("/login") || pathname.startsWith("/tma") || pathname.startsWith("/track")) {
    return <>{children}</>;
  }

  const title = pageTitle(pathname);
  const initials = (currentUser?.name || "").slice(0, 1).toUpperCase();

  const renderSidebarContent = (isDrawer = false) => {
    const collapsed = !isDrawer && isCollapsed;

    return (
      <div className="flex flex-col h-full bg-ink text-slate-300 select-none">
        {/* Логотип */}
        <div className={cn("h-16 flex items-center shrink-0", collapsed ? "justify-center px-2" : "justify-between px-4")}>
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
            <img src="/logo.png" alt="Master Print" className="w-9 h-9 rounded-xl object-cover shrink-0" />
            {!collapsed && (
              <div className="truncate leading-none">
                <div className="font-extrabold text-white text-[15px] tracking-tight">Master Print</div>
                <div className="text-[11px] text-slate-400 mt-1">Агентство и цех</div>
              </div>
            )}
          </Link>
          {isDrawer && (
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 -mr-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              aria-label="Закрыть меню"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="cmyk-strip opacity-80" />

        {/* Новый наряд */}
        {canCreateOrder && (
          <div className={cn("pt-4 pb-2", collapsed ? "px-2" : "px-3")}>
            <Link
              href="/orders/new"
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 transition active:scale-95",
                collapsed ? "w-11 h-11 mx-auto" : "w-full py-2.5"
              )}
              title="Новый наряд"
            >
              <Plus className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Новый наряд</span>}
            </Link>
          </div>
        )}

        {/* Разделы */}
        <nav className="flex-1 overflow-y-auto nav-scroll px-2.5 py-3 space-y-5" aria-label="Разделы">
          {!userLoaded ? (
            <div className="space-y-2 px-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-8 rounded-lg bg-white/5" />
              ))}
            </div>
          ) : (
            navGroups.map((group) => (
              <div key={group.group} className="space-y-0.5">
                {!collapsed ? (
                  <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    {group.group}
                  </div>
                ) : (
                  <div className="w-5 h-px bg-white/10 mx-auto my-2" />
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.match(pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg text-[13px] font-semibold transition-colors",
                        collapsed ? "justify-center w-11 h-11 mx-auto" : "px-3 py-2.5",
                        active ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <Icon className={cn("w-[18px] h-[18px] shrink-0", active ? "text-brand-400" : "")} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            ))
          )}
        </nav>

        {/* Профиль и выход */}
        <div className="p-3 border-t border-white/10">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-9 h-9 rounded-full bg-brand-600 text-white font-bold text-sm flex items-center justify-center"
                title={currentUser ? `${currentUser.name} · ${currentUser.roleTitle}` : ""}
              >
                {initials}
              </div>
              <button
                type="button"
                onClick={toggleCollapse}
                className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10"
                title="Развернуть панель"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-brand-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{currentUser?.name || "…"}</div>
                  <div className="text-[11px] text-slate-400 truncate">{currentUser?.roleTitle || ""}</div>
                </div>
              </div>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-300 hover:bg-white/10"
                  title="Выйти"
                  aria-label="Выйти"
                >
                  <LogOut className="w-4 h-4" />
                </button>
                {!isDrawer && (
                  <button
                    type="button"
                    onClick={toggleCollapse}
                    className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10"
                    title="Свернуть панель"
                    aria-label="Свернуть панель"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Боковое меню на компьютере */}
      <aside
        className={cn(
          "hidden md:block fixed inset-y-0 left-0 z-40 transition-[width] duration-200 no-print",
          isCollapsed ? "w-[72px]" : "w-60"
        )}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Выезжающее меню на телефоне */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex no-print" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-ink/60" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 pt-safe bg-ink">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      <div className={cn("flex-1 flex flex-col min-h-screen min-w-0 transition-[padding] duration-200", isCollapsed ? "md:pl-[72px]" : "md:pl-60")}>
        {/* Верхняя панель */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 no-print pt-safe">
          <div className="h-14 flex items-center justify-between gap-2 px-3 sm:px-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg object-cover md:hidden shrink-0" />
              <h1 className="text-base sm:text-[17px] font-extrabold text-slate-900 tracking-tight truncate">{title}</h1>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="h-10 px-2.5 sm:px-3 rounded-xl text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 transition flex items-center gap-2 text-sm"
                title="Поиск (Ctrl+K)"
                aria-label="Поиск"
              >
                <Search className="w-4 h-4" />
                <span className="hidden lg:inline pr-6">Поиск заказа, клиента…</span>
                <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded">
                  Ctrl K
                </kbd>
              </button>

              <button
                onClick={() => setIsQRScannerOpen(true)}
                className="h-10 w-10 rounded-xl text-slate-600 hover:text-brand-700 hover:bg-brand-50 transition flex items-center justify-center"
                title="Сканировать QR наряда"
                aria-label="Сканировать QR наряда"
              >
                <QrCode className="w-5 h-5" />
              </button>

              <DeadlineNotificationCenter currentUser={currentUser} />

              {canCreateOrder && (
                <Link
                  href="/orders/new"
                  className="hidden md:inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition"
                >
                  <Plus className="w-4 h-4" />
                  Наряд
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Содержимое страницы; снизу место под панель вкладок на телефоне */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6 py-4 pb-28 md:pb-6">
          {children}
        </main>
      </div>

      {/* Нижняя панель вкладок на телефоне */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 pb-safe no-print"
        aria-label="Быстрые разделы"
      >
        <div className="grid grid-cols-5 h-16">
          {bottomItems.map((item) => {
            if (item === "new") {
              return (
                <Link
                  key="new"
                  href="/orders/new"
                  className="flex flex-col items-center justify-center gap-0.5"
                  aria-label="Новый наряд"
                >
                  <span className="w-12 h-12 -mt-5 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/30 ring-4 ring-white">
                    <Plus className="w-6 h-6" />
                  </span>
                  <span className="text-[10px] font-bold text-slate-600">Наряд</span>
                </Link>
              );
            }
            if (item === "more") {
              return (
                <button
                  key="more"
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="flex flex-col items-center justify-center gap-1 text-slate-500"
                >
                  <Menu className="w-[22px] h-[22px]" />
                  <span className="text-[10px] font-bold">Ещё</span>
                </button>
              );
            }
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-colors",
                  active ? "text-brand-600" : "text-slate-500"
                )}
              >
                <Icon className="w-[22px] h-[22px]" />
                <span className="text-[10px] font-bold">{item.label === "Канбан цеха" ? "Канбан" : item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <QRScannerModal isOpen={isQRScannerOpen} onClose={() => setIsQRScannerOpen(false)} />
    </div>
  );
}
