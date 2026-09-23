import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { 
  CheckCircle2, 
  Clock, 
  Layers, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Calendar,
  Sparkles,
  Printer,
  Hammer,
  Truck,
  Award
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const revalidate = 0;

export default async function ClientOrderTrackingPage({ params }: { params: { id: string } }) {
  const orderId = parseInt(params.id);
  if (isNaN(orderId)) {
    return <div className="p-12 text-center text-slate-500 font-bold">Неверный номер заказа</div>;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      client: true,
      items: true,
      comments: {
        where: { photoUrl: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 4,
      },
    },
  });

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow border border-slate-200 text-center max-w-md space-y-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            🔍
          </div>
          <h1 className="text-xl font-bold text-slate-900">Заказ не найден</h1>
          <p className="text-xs text-slate-500">
            Возможно, ссылка устарела или номер наряда введен неверно. Уточните у менеджера.
          </p>
        </div>
      </div>
    );
  }

  // Этапы для клиента
  const STAGES = [
    { key: "NEW", label: "Оформление", icon: Clock, desc: "Принят в работу" },
    { key: "DESIGN", label: "Макет & Дизайн", icon: Sparkles, desc: "Согласование в CorelDRAW" },
    { key: "PRINTING", label: "Печать / Раскрой", icon: Printer, desc: "Широкоформатная печать 3.2м" },
    { key: "ASSEMBLY", label: "Сборка букв LED", icon: Hammer, desc: "Установка диодов и каркаса" },
    { key: "MOUNTING", label: "Монтаж на объекте", icon: Truck, desc: "Выезд монтажной бригады" },
    { key: "READY", label: "Готов к сдаче", icon: CheckCircle2, desc: "Контроль качества" },
    { key: "COMPLETED", label: "Сдан & Гарантия", icon: Award, desc: "12 месяцев гарантии" },
  ];

  const currentStageIndex = STAGES.findIndex((s) => s.key === order.status);
  const activeIndex = currentStageIndex >= 0 ? currentStageIndex : 0;

  return (
    <div className="min-h-screen bg-slate-100/60 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Шапка трекера */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold">
            <Layers className="w-4 h-4" />
            <span>OUTDOOR PRODUCTION &bull; ТРЕКЕР ЗАКАЗА</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {order.title}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 font-mono pt-1">
            <span>Наряд: <b>{order.orderNumber}</b></span>
            <span>&bull;</span>
            <span>Заказчик: <b className="text-slate-800">{order.client?.name}</b></span>
            {order.deadline && (
              <>
                <span>&bull;</span>
                <span className="text-emerald-700 font-bold">
                  Срок: {new Date(order.deadline).toLocaleDateString("ru-RU")}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Шкала статуса заказа */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Статус выполнения изделия
            </h2>
            <span className="px-3 py-1 rounded-xl bg-teal-600 text-white font-bold text-xs">
              {STAGES[activeIndex]?.label || order.status}
            </span>
          </div>

          {/* Визуальные шаги */}
          <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-6">
            {STAGES.map((stage, idx) => {
              const isPast = idx < activeIndex;
              const isCurrent = idx === activeIndex;
              const Icon = stage.icon;

              return (
                <div key={stage.key} className="relative">
                  {/* Иконка / точка на шкале */}
                  <div
                    className={`absolute -left-[35px] sm:-left-[43px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition ${
                      isPast
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-xs"
                        : isCurrent
                        ? "bg-teal-600 border-teal-600 text-white ring-4 ring-teal-100 animate-pulse"
                        : "bg-white border-slate-300 text-slate-400"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div>
                    <div className={`font-bold text-sm ${isCurrent ? "text-teal-700 font-black" : isPast ? "text-slate-900" : "text-slate-400"}`}>
                      {stage.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {stage.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Эскиз макета */}
        {order.previewUrl && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Утвержденный дизайн-макет
            </h3>
            <img
              src={order.previewUrl}
              alt="Макет вывески"
              className="w-full max-h-96 object-contain rounded-2xl border border-slate-100 bg-slate-50 shadow-inner"
            />
          </div>
        )}

        {/* Фотоотчеты с производства */}
        {order.comments && order.comments.length > 0 && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Фотоотчет мастеров из цеха
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {order.comments.map((comm) => (
                <div key={comm.id} className="space-y-1">
                  <img
                    src={comm.photoUrl!}
                    alt="Фото производства"
                    className="w-full h-48 object-cover rounded-xl border border-slate-200"
                  />
                  <div className="text-[11px] text-slate-600 font-medium">
                    {comm.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Спецификация изделия для клиента */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Параметры конструкции
          </h3>
          <div className="space-y-2">
            {order.items?.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center"
              >
                <div>
                  <div className="font-bold text-slate-900">{item.title}</div>
                  {item.options && <div className="text-[11px] text-slate-500">{item.options}</div>}
                  {item.letterText && (
                    <div className="text-[11px] text-orange-800 font-semibold mt-0.5">
                      Текст букв: «{item.letterText}»
                    </div>
                  )}
                </div>
                <div className="font-mono font-bold text-slate-700 text-right">
                  {item.area ? `${item.area} м²` : item.letterCount ? `${item.letterCount} букв × ${item.letterHeight}см` : `${item.quantity} шт`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Гарантийный паспорт */}
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 text-xs text-emerald-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Официальная гарантия 12 месяцев</span>
          </div>
          <p className="leading-relaxed text-[11px]">
            На светотехническую часть (диоды Samsung, блоки питания IP67) и прочность монтажных узлов действует полная гарантия 1 год со дня завершения монтажа.
          </p>
          <div className="pt-2 flex items-center justify-between border-t border-emerald-200/60 text-[11px]">
            <span>Сервисная служба: <b>+998 91 222 33 44</b></span>
            <span className="font-mono">Outdoor Production</span>
          </div>
        </div>

        {/* Подвал */}
        <div className="text-center text-xs text-slate-400 py-4">
          Outdoor ERP &bull; Профессиональное производство наружной рекламы
        </div>
      </div>
    </div>
  );
}
