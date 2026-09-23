import { Decimal } from "../calculator/decimal";

export interface LetterElement {
  char: string;
  isWordSeparator: boolean;
  isSpecialSymbol: boolean;
}

export function parseAdvertisingText(rawText: string): {
  normalizedText: string;
  elements: string[];
  chargeableCount: number;
} {
  if (!rawText) return { normalizedText: "", elements: [], chargeableCount: 0 };

  // Нормализация узбекских букв Oʻ и Gʻ
  // Заменяем сочетания O' / Oʻ / G' / Gʻ на единый токен
  const normalized = rawText.trim();
  const elements: string[] = [];

  let i = 0;
  while (i < normalized.length) {
    const char = normalized[i];

    // Пропуск пробелов и переносов строк (не оплачиваются, раздел 6 ТЗ)
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Проверка узбекских букв Oʻ, oʻ, Gʻ, gʻ
    const nextChar = normalized[i + 1];
    if (
      (char === "O" || char === "o" || char === "G" || char === "g") &&
      (nextChar === "ʻ" || nextChar === "‘" || nextChar === "’" || nextChar === "'")
    ) {
      elements.push(char + nextChar);
      i += 2;
      continue;
    }

    elements.push(char);
    i++;
  }

  return {
    normalizedText: normalized,
    elements,
    chargeableCount: elements.length,
  };
}

export interface LedPowerCalculation {
  moduleCount: number;
  moduleWatts: number;
  totalModuleWatts: string;
  reserveFactor: number; // 1.25 (+25% запаса по мощности)
  requiredPowerWatts: string;
  suggestedPowerSupplyWatts: number; // 100, 150, 200, 250, 350
  powerSupplyCount: number;
  warnings: string[];
}

export function calculateLedSystem(
  letterCount: number,
  averageHeightCm: number,
  lightingType: "none" | "front" | "back" | "double" = "front",
  moduleWatts: number = 1.2,
  reserveFactor: number = 1.25
): LedPowerCalculation | null {
  // S13: При отключении подсветки компоненты света убираются
  if (lightingType === "none") {
    return null;
  }

  // Расчет модулей по высоте буквы:
  // Для буквы 30 см обычно требуется 6-10 модулей в зависимости от шрифта
  const modulesPerLetter = Math.max(3, Math.round((averageHeightCm / 30) * 8));
  let totalModules = modulesPerLetter * letterCount;
  if (lightingType === "double") {
    totalModules *= 2; // лицевая + контражур
  }

  const totalWatts = new Decimal(totalModules).times(new Decimal(moduleWatts));
  const reqPower = totalWatts.times(new Decimal(reserveFactor));

  // Подбор блока питания IP67: 100, 150, 200, 250, 350W
  const availablePSU = [100, 150, 200, 250, 350];
  const reqNum = reqPower.toNumber();

  let selectedPsu = 100;
  let psuCount = 1;

  if (reqNum <= 350) {
    selectedPsu = availablePSU.find((w) => w >= reqNum) || 350;
    psuCount = 1;
  } else {
    selectedPsu = 350;
    psuCount = Math.ceil(reqNum / 350);
  }

  const warnings: string[] = [];
  if (lightingType === "back") {
    warnings.push("Для задней подсветки (контражур) необходимы дистанционные держатели 25-50 мм от фасада");
  }

  return {
    moduleCount: totalModules,
    moduleWatts,
    totalModuleWatts: totalWatts.toFixed(1),
    reserveFactor,
    requiredPowerWatts: reqPower.toFixed(1),
    suggestedPowerSupplyWatts: selectedPsu,
    powerSupplyCount: psuCount,
    warnings,
  };
}

export function validateMaterialCompatibility(
  surfaceMaterial: string,
  lightingType: "none" | "front" | "back" | "double"
): { isValid: boolean; error?: string } {
  // S13: Проверка несовместимых сочетаний материалов и свечения
  const opaqueMaterials = ["композит", "металл", "нержавеющая сталь", "зеркальный пластик", "золото"];
  const isOpaque = opaqueMaterials.some((m) => surfaceMaterial.toLowerCase().includes(m));

  if (isOpaque && (lightingType === "front" || lightingType === "double")) {
    return {
      isValid: false,
      error: `Несовместимое сочетание: непрозрачный материал лицевой части («${surfaceMaterial}») не пропускает свет. Выберите акрил для лицевого свечения либо переключите подсветку на заднюю («контражур»).`,
    };
  }

  return { isValid: true };
}
