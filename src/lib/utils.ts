import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined, currency = "UZS"): string {
  const val = Number(amount || 0);
  const formatted = Math.round(val).toLocaleString("ru-RU");
  return `${formatted} сум`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function countLetters(text: string | null | undefined): number {
  if (!text) return 0;
  const match = text.match(/[a-zA-Z0-9а-яА-ЯёЁ]/g);
  return match ? match.length : 0;
}

export interface DeadlineInfo {
  label: string;
  isOverdue: boolean;
  isUrgent: boolean;
  colorClass: string;
  badgeClass: string;
}

export function getDeadlineInfo(deadline: string | Date | null | undefined, isCompleted = false): DeadlineInfo {
  if (!deadline) {
    return {
      label: "Без срока",
      isOverdue: false,
      isUrgent: false,
      colorClass: "text-slate-400",
      badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    };
  }

  if (isCompleted) {
    return {
      label: "Сдан",
      isOverdue: false,
      isUrgent: false,
      colorClass: "text-emerald-600",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }

  const d = typeof deadline === "string" ? new Date(deadline) : deadline;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours < 0) {
    const overdueHours = Math.abs(diffHours);
    const label = overdueHours < 24 ? `Просрочен на ${overdueHours} ч` : `Просрочен на ${Math.round(overdueHours / 24)} дн`;
    return {
      label,
      isOverdue: true,
      isUrgent: true,
      colorClass: "text-red-600 font-bold",
      badgeClass: "bg-red-100 text-red-700 border-red-300 font-bold animate-pulse",
    };
  }

  if (diffHours <= 12) {
    return {
      label: `Осталось ${diffHours} ч 🔥`,
      isOverdue: false,
      isUrgent: true,
      colorClass: "text-amber-700 font-bold",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
    };
  }

  if (diffHours <= 36) {
    return {
      label: "Срок: завтра",
      isOverdue: false,
      isUrgent: false,
      colorClass: "text-blue-700",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  const days = Math.round(diffHours / 24);
  return {
    label: `Осталось ${days} дн`,
    isOverdue: false,
    isUrgent: false,
    colorClass: "text-slate-700",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  };
}

export const STAGES = [
  { key: "NEW", title: "Новые заявки", color: "border-amber-400", bg: "bg-amber-500", text: "text-amber-700" },
  { key: "DESIGN", title: "Дизайн / Макет", color: "border-blue-500", bg: "bg-blue-500", text: "text-blue-700", role: "Жалгас" },
  { key: "PRINTING", title: "Печать баннера", color: "border-purple-500", bg: "bg-purple-500", text: "text-purple-700", role: "Альберт" },
  { key: "ASSEMBLY", title: "Сборка букв/короба", color: "border-orange-500", bg: "bg-orange-500", text: "text-orange-700", role: "Абзал" },
  { key: "MOUNTING", title: "Монтаж на объекте", color: "border-cyan-500", bg: "bg-cyan-500", text: "text-cyan-700", role: "Абзал" },
  { key: "READY", title: "Готовы к выдаче", color: "border-teal-500", bg: "bg-teal-500", text: "text-teal-700" },
  { key: "COMPLETED", title: "Сданы и оплачены", color: "border-emerald-500", bg: "bg-emerald-500", text: "text-emerald-700" },
];

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; responsible?: string }> = {
  NEW: { label: "Новый", color: "text-amber-800", bg: "bg-amber-50", border: "border-amber-300" },
  DESIGN: { label: "Макет / Дизайн", color: "text-blue-800", bg: "bg-blue-50", border: "border-blue-300", responsible: "Жалгас" },
  PRINTING: { label: "Печать баннера", color: "text-purple-800", bg: "bg-purple-50", border: "border-purple-300", responsible: "Альберт" },
  ASSEMBLY: { label: "Сборка букв", color: "text-orange-800", bg: "bg-orange-50", border: "border-orange-300", responsible: "Абзал" },
  MOUNTING: { label: "Монтаж", color: "text-cyan-800", bg: "bg-cyan-50", border: "border-cyan-300", responsible: "Абзал" },
  READY: { label: "Готов к сдаче", color: "text-teal-800", bg: "bg-teal-50", border: "border-teal-300" },
  COMPLETED: { label: "Сдан", color: "text-emerald-800", bg: "bg-emerald-50", border: "border-emerald-300" },
};
