import Decimal from "decimal.js";
import { DimensionInput } from "./types";

// Настройка Decimal: 20 знаков точности для денег и геометрии
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export function parseDecimal(val: Decimal | string | number | undefined | null, defaultValue: string = "0"): Decimal {
  if (val instanceof Decimal) {
    return val;
  }
  if (val === undefined || val === null || val === "") {
    return new Decimal(defaultValue);
  }
  if (typeof val === "number") {
    if (!isFinite(val)) throw new Error("Значение не является конечным числом");
    return new Decimal(val.toString());
  }
  // Нормализация разделителя: замена запятой на точку
  const cleanStr = val.toString().trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleanStr)) {
    throw new Error(`Недопустимый числовой формат: "${val}"`);
  }
  return new Decimal(cleanStr);
}

export function toMeters(dim: DimensionInput | undefined): Decimal {
  if (!dim) return new Decimal(0);
  const val = parseDecimal(dim.value);
  if (val.isNegative()) {
    throw new Error("Размер не может быть отрицательным");
  }

  switch (dim.unit) {
    case "mm":
      return val.dividedBy(1000);
    case "cm":
      return val.dividedBy(100);
    case "m":
      return val;
    default:
      throw new Error(`Неизвестная единица измерения: ${(dim as any).unit}`);
  }
}

export function formatUzCurrency(val: Decimal | string | number): string {
  const d = parseDecimal(val);
  const rounded = d.round();
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " UZS";
}

export function roundToStep(amount: Decimal, step: number = 1, direction: "up" | "nearest" | "down" = "up"): Decimal {
  if (step <= 1) {
    return amount.round();
  }
  const s = new Decimal(step);
  if (direction === "up") {
    return amount.dividedBy(s).ceil().times(s);
  } else if (direction === "down") {
    return amount.dividedBy(s).floor().times(s);
  } else {
    return amount.dividedBy(s).round().times(s);
  }
}
