import Link from "next/link";
import { STAGES } from "@/lib/utils";

interface ProductionPipelineProps {
  /** Сколько нарядов на каждом этапе */
  counts: Record<string, number>;
  /** Сколько из них горят по сроку */
  urgent: Record<string, number>;
}

/**
 * Конвейер цеха: где сейчас стоят наряды. Полоса сверху показывает доли этапов,
 * ячейки ниже — сколько нарядов на этапе и кто за него отвечает.
 * Рассчитан на тёмно-синий фон (bg-ink).
 */
export function ProductionPipeline({ counts, urgent }: ProductionPipelineProps) {
  const stages = STAGES.filter((s) => s.key !== "COMPLETED");
  const total = stages.reduce((sum, s) => sum + (counts[s.key] || 0), 0);

  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden bg-white/10 gap-0.5" aria-hidden>
        {total > 0 &&
          stages.map((s) =>
            counts[s.key] ? <div key={s.key} className={s.bg} style={{ flexGrow: counts[s.key] }} /> : null
          )}
      </div>

      <div className="mt-4 grid grid-cols-3 lg:grid-cols-6 gap-px rounded-xl overflow-hidden bg-white/10">
        {stages.map((s) => {
          const n = counts[s.key] || 0;
          const hot = urgent[s.key] || 0;
          return (
            <Link
              key={s.key}
              href={`/orders/kanban?stage=${s.key}`}
              className="bg-ink hover:bg-[#0d1433] transition-colors px-3 py-3 sm:px-4 sm:py-3.5 min-w-0"
            >
              <div className="flex items-center gap-1.5 text-[13px] text-slate-400">
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.bg}`} />
                <span className="truncate">{s.short}</span>
              </div>
              <div className={`mt-1 text-[26px] leading-none font-extrabold tabular-nums ${n ? "text-white" : "text-slate-600"}`}>
                {n}
              </div>
              <div className="mt-1.5 text-xs truncate">
                {hot > 0 ? (
                  <span className="text-red-300 font-semibold">горит {hot}</span>
                ) : (
                  <span className="text-slate-500">{s.role || " "}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
