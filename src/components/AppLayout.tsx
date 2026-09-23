"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calculator,
  PlusCircle,
  KanbanSquare,
  ClipboardList,
  Calendar,
  Wrench,
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
  Sparkles,
  Layers,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  UserCheck,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobalSearchModal } from "@/components/GlobalSearchModal";
import { QRScannerModal } from "@/components/QRScannerModal";
import { DeadlineNotificationCenter } from "@/components/DeadlineNotificationCenter";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Restore sidebar collapse state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("masterprint_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
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

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Load current user profile from /api/auth/me
  useEffect(() => {
    if (pathname?.startsWith("/login")) return;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  // Global keyboard shortcut Ctrl+K
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

  // Dynamic page title based on active pathname
  const getPageMeta = () => {
    if (pathname === "/") return { title: "Дашборд цеха", section: "Главная" };
    if (pathname === "/calculator") return { title: "Калькулятор изделий ТЗ 1.0", section: "Расчеты" };
    if (pathname === "/orders/kanban") return { title: "Канбан цеха (7 этапов)", section: "Производство" };
    if (pathname === "/orders/new") return { title: "Оформление нового наряда", section: "Заказы" };
    if (pathname === "/orders") return { title: "Реестр заказов и нарядов", section: "Производство" };
    if (pathname.startsWith("/orders/")) return { title: "Карточка наряда цеха", section: "Заказы" };
    if (pathname.startsWith("/calendar")) return { title: "Календарь дедлайнов & монтажей", section: "План" };
    if (pathname.startsWith("/finance")) return { title: "Касса, финансы & должники", section: "Бухгалтерия" };
    if (pathname.startsWith("/clients")) return { title: "База клиентов & CRM", section: "Клиенты" };
    if (pathname.startsWith("/payroll")) return { title: "Сдельные зарплаты мастеров", section: "Зарплаты" };
    if (pathname.startsWith("/warehouse")) return { title: "Склад материалов и фурнитуры", section: "Склад" };
    if (pathname.startsWith("/reports")) return { title: "Аналитика & производственные KPI", section: "Отчеты" };
    if (pathname.startsWith("/settings/services")) return { title: "Конструктор услуг и тарифов (S02/S04)", section: "Настройки" };
    if (pathname.startsWith("/settings/pricing")) return { title: "Базовые прайс-листы", section: "Настройки" };
    if (pathname.startsWith("/settings/telegram")) return { title: "Интеграция Telegram-бота цеха", section: "Связь" };
    if (pathname.startsWith("/settings/backup")) return { title: "Резервные копии БД", section: "Система" };
    if (pathname.startsWith("/production/nukus-boxes")) return { title: "Линия коробок: Нукус гуллери", section: "Цех" };
    return { title: "Master Print ERP", section: "Система" };
  };

  const pageMeta = getPageMeta();

  // Full Navigation structure
  const rawNavGroups = [
    {
      group: "ОСНОВНОЕ",
      items: [
        {
          href: "/",
          label: "Дашборд",
          icon: LayoutDashboard,
          active: pathname === "/",
        },
        {
          href: "/calculator",
          label: "Калькулятор ТЗ",
          icon: Calculator,
          active: pathname === "/calculator",
          badge: "ТЗ 1.0",
          badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        },
        {
          href: "/orders/kanban",
          label: "Канбан цеха",
          icon: KanbanSquare,
          active: pathname === "/orders/kanban",
          badge: "7 этапов",
          badgeColor: "bg-blue-50 text-blue-700 border border-blue-200",
        },
        {
          href: "/orders",
          label: "Реестр заказов",
          icon: ClipboardList,
          active:
            pathname.startsWith("/orders") &&
            pathname !== "/orders/new" &&
            pathname !== "/orders/kanban",
        },
        {
          href: "/calendar",
          label: "Календарь",
          icon: Calendar,
          active: pathname.startsWith("/calendar"),
        },
      ],
    },
    {
      group: "ФИНАНСЫ & КЛИЕНТЫ",
      items: [
        {
          href: "/finance",
          label: "Касса & Долги",
          icon: Wallet,
          active: pathname.startsWith("/finance"),
        },
        {
          href: "/clients",
          label: "Клиенты & CRM",
          icon: Users,
          active: pathname.startsWith("/clients"),
        },
        {
          href: "/payroll",
          label: "Зарплаты мастеров",
          icon: Banknote,
          active: pathname.startsWith("/payroll"),
        },
      ],
    },
    {
      group: "ПРОИЗВОДСТВО & СКЛАД",
      items: [
        {
          href: "/warehouse",
          label: "Склад материалов",
          icon: Warehouse,
          active: pathname.startsWith("/warehouse"),
        },
        {
          href: "/production/nukus-boxes",
          label: "Коробки Нукус гуллери",
          icon: Package,
          active: pathname.startsWith("/production/nukus-boxes"),
          badge: "Абзал",
          badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        },
      ],
    },
    {
      group: "НАСТРОЙКИ & ОТЧЕТЫ",
      items: [
        {
          href: "/settings/services",
          label: "Конструктор услуг",
          icon: Sliders,
          active: pathname.startsWith("/settings/services"),
          badge: "S02/S04",
          badgeColor: "bg-purple-50 text-purple-700 border border-purple-200",
        },
        {
          href: "/reports",
          label: "Отчеты & KPI",
          icon: BarChart3,
          active: pathname.startsWith("/reports"),
        },
        {
          href: "/settings/pricing",
          label: "Прайс-листы",
          icon: Layers,
          active: pathname.startsWith("/settings/pricing"),
        },
        {
          href: "/settings/telegram",
          label: "Telegram цеха",
          icon: Send,
          active: pathname.startsWith("/settings/telegram"),
        },
        {
          href: "/settings/backup",
          label: "Бэкапы БД",
          icon: Database,
          active: pathname.startsWith("/settings/backup"),
        },
      ],
    },
  ];

  // Role-based filtering of navigation
  const navGroups = useMemo(() => {
    if (!currentUser) return rawNavGroups;
    const role = currentUser.role;

    // Мастера цеха (Абзал, Альберт): личная выработка, канбан, заказы, склад, станки
    if (role === "WORKSHOP_ASSEMBLY" || role === "WORKSHOP_PRINTING") {
      return [
        {
          group: "ЦЕХ & НАРЯДЫ",
          items: [
            {
              href: "/",
              label: "Моя выработка",
              icon: LayoutDashboard,
              active: pathname === "/",
            },
            {
              href: "/orders/kanban",
              label: "Канбан цеха",
              icon: KanbanSquare,
              active: pathname === "/orders/kanban",
              badge: "7 этапов",
              badgeColor: "bg-blue-50 text-blue-700 border border-blue-200",
            },
            {
              href: "/orders",
              label: "Реестр заказов",
              icon: ClipboardList,
              active:
                pathname.startsWith("/orders") &&
                pathname !== "/orders/new" &&
                pathname !== "/orders/kanban",
            },
            {
              href: "/calendar",
              label: "Календарь",
              icon: Calendar,
              active: pathname.startsWith("/calendar"),
            },
            {
              href: "/production/nukus-boxes",
              label: "Коробки Нукус гуллери",
              icon: Package,
              active: pathname.startsWith("/production/nukus-boxes"),
              badge: "Партии",
              badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200",
            },
          ],
        },
        {
          group: "ПРОИЗВОДСТВО & СКЛАД",
          items: [
            {
              href: "/warehouse",
              label: "Склад материалов",
              icon: Warehouse,
              active: pathname.startsWith("/warehouse"),
            },
          ],
        },
      ];
    }

    // Менеджер (Жалгас): заказы, калькулятор, клиенты, канбан. БЕЗ полного финансового отчета и кассы
    if (role === "SALES_DESIGNER") {
      return rawNavGroups
        .map((group) => {
          if (group.group === "ФИНАНСЫ & КЛИЕНТЫ") {
            return {
              ...group,
              items: group.items.filter((it) => it.href === "/clients"),
            };
          }
          if (group.group === "НАСТРОЙКИ & ОТЧЕТЫ") {
            return {
              ...group,
              items: group.items.filter((it) => it.href === "/settings/telegram"),
            };
          }
          return group;
        })
        .filter((g) => g.items.length > 0);
    }

    // Директор (Тимур): полный доступ
    return rawNavGroups;
  }, [currentUser, pathname]);

  // On Login page, render directly without layout shell
  if (pathname?.startsWith("/login")) {
    return <>{children}</>;
  }

  const renderSidebarContent = (isDrawer = false) => {
    const collapsed = !isDrawer && isCollapsed;

    return (
      <div className="flex flex-col h-full bg-white text-slate-700 border-r border-slate-200 shadow-xs select-none">
        {/* Brand Header */}
        <div
          className={cn(
            "h-16 border-b border-slate-100 flex items-center transition-all",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          <Link href="/" className="flex items-center gap-2.5 group overflow-hidden">
            <img
              src="/logo.png"
              alt="Master Print"
              className="w-9 h-9 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform shrink-0"
            />
            {!collapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1 font-black text-slate-900 text-sm tracking-tight leading-none">
                  <span>MASTER</span>
                  <span className="text-blue-600">PRINT</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-1 truncate">
                  Рекламное агентство
                </p>
              </div>
            )}
          </Link>

          {/* Close button in mobile drawer */}
          {isDrawer && (
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Desktop collapse toggle icon button */}
          {!isDrawer && !collapsed && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Свернуть панель"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Action: Новый наряд (если не мастер печати) */}
        {currentUser?.role !== "WORKSHOP_PRINTING" && (
          <div className={cn("p-3 border-b border-slate-100", collapsed && "px-2")}>
            <Link
              href="/orders/new"
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition active:scale-95",
                collapsed ? "w-10 h-10 mx-auto p-0" : "w-full py-2.5 px-3"
              )}
              title="Создать новый наряд"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Новый наряд</span>}
            </Link>
          </div>
        )}

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-200">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-0.5">
              {!collapsed ? (
                <div className="px-2.5 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  {group.group}
                </div>
              ) : (
                <div className="w-4 h-0.5 bg-slate-100 mx-auto my-1.5 rounded-full" />
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center rounded-xl text-xs font-semibold transition-all group",
                      collapsed
                        ? "justify-center w-10 h-10 mx-auto"
                        : "justify-between px-3 py-2",
                      item.active
                        ? "bg-blue-50 text-blue-700 font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn("flex items-center gap-2.5 truncate", collapsed && "justify-center")}>
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          item.active
                            ? "text-blue-600"
                            : "text-slate-500 group-hover:text-slate-700"
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!collapsed && item.badge && (
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-bold leading-none shrink-0",
                          item.badgeColor || "bg-slate-100 text-slate-600"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Profile with LOGOUT button */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center"
                title={`${currentUser?.name || "Сотрудник"} (${currentUser?.roleTitle || ""})`}
              >
                {currentUser?.name?.[0] || "М"}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-white transition"
                title="Выйти из системы"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                  {currentUser?.name?.[0] || "Т"}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-900 leading-tight truncate">
                    {currentUser?.name || "Тимур"}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {currentUser?.roleTitle || "Директор"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
                  title="Выйти из системы"
                >
                  <LogOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={toggleCollapse}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition"
                  title="Свернуть панель"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* DESKTOP FIXED SIDEBAR */}
      <aside
        className={cn(
          "hidden md:block fixed inset-y-0 left-0 z-40 transition-all duration-200 no-print",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* MOBILE DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* MAIN CONTENT WRAPPER */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen w-full transition-all duration-200",
          isCollapsed ? "md:pl-16" : "md:pl-60"
        )}
      >
        {/* COMPACT TOP UTILITY HEADER */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/80 shadow-2xs h-14 flex items-center justify-between px-4 sm:px-6 lg:px-8 no-print">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden transition border border-slate-200"
              title="Меню разделов"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop un-collapse trigger when collapsed */}
            {isCollapsed && (
              <button
                type="button"
                onClick={toggleCollapse}
                className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200"
                title="Развернуть панель"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            {/* Breadcrumb & Section Title */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold">
                {pageMeta.section}
              </span>
              <span className="hidden sm:inline text-slate-300 font-light">/</span>
              <h1 className="text-sm font-black text-slate-900 truncate">
                {pageMeta.title}
              </h1>
            </div>
          </div>

          {/* Right utility actions */}
          <div className="flex items-center gap-2">
            {/* Центр контроля горящих дедлайнов (колокольчик с огнем и быстрые действия) */}
            <DeadlineNotificationCenter currentUser={currentUser} />

            {/* Current user badge */}
            {currentUser && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-xs text-slate-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-slate-900">{currentUser.name}</span>
                <span className="text-[11px] text-slate-400">({currentUser.roleTitle})</span>
              </div>
            )}

            {/* Quick search input button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition border border-slate-200 flex items-center gap-2 text-xs font-medium"
              title="Глобальный поиск по базе (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline text-slate-500">Поиск...</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-400 bg-white border border-slate-200 rounded">
                Ctrl+K
              </kbd>
            </button>

            {/* QR Scanner */}
            <button
              onClick={() => setIsQRScannerOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition border border-slate-200 hover:border-blue-200"
              title="Сканировать QR-код наряда"
            >
              <QrCode className="w-4 h-4" />
            </button>

            {/* Quick Create Order */}
            {currentUser?.role !== "WORKSHOP_PRINTING" && (
              <Link
                href="/orders/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs shadow-blue-600/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">+ Наряд</span>
              </Link>
            )}
          </div>
        </header>

        {/* MAIN PAGE BODY */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6 py-3 sm:py-4">
          {children}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
      />
    </div>
  );
}
