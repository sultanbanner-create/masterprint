import { Decimal } from "../calculator/decimal";

export interface HeightRangeTariff {
  minCm: number; // включительно
  maxCm: number; // исключительно
  ratePerCm: number;
}

export interface ServiceDefinition {
  id: string;
  code: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description?: string;
  unit: string;
  defaultRate?: number;
  heightTariffs?: HeightRangeTariff[];
  isBundle?: boolean;
  includedComponents?: string[];
  subServices?: ServiceDefinition[];
}

// Проверка корректности диапазонов высот (S04)
export function validateHeightTariffs(tariffs: HeightRangeTariff[]): { isValid: boolean; error?: string } {
  const sorted = [...tariffs].sort((a, b) => a.minCm - b.minCm);

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    if (current.minCm >= current.maxCm) {
      return { isValid: false, error: `Диапазон [${current.minCm}; ${current.maxCm}) некорректен: минимум больше или равен максимуму` };
    }

    if (i > 0) {
      const prev = sorted[i - 1];
      if (prev.maxCm > current.minCm) {
        return { isValid: false, error: `Перекрытие диапазонов: [${prev.minCm}; ${prev.maxCm}) и [${current.minCm}; ${current.maxCm})` };
      }
      if (prev.maxCm < current.minCm) {
        return { isValid: false, error: `Разрыв между диапазонами: от ${prev.maxCm} до ${current.minCm}` };
      }
    }
  }

  return { isValid: true };
}

// Получение тарифа для заданной высоты на границах [min, max) (S04)
export function getRateForHeight(heightCm: number, tariffs: HeightRangeTariff[]): number | null {
  for (const t of tariffs) {
    // minCm <= heightCm < maxCm
    if (heightCm >= t.minCm && heightCm < t.maxCm) {
      return t.ratePerCm;
    }
  }
  return null;
}

// Базовый каталог услуг Master Print
export const MASTER_PRINT_CATALOG: ServiceDefinition[] = [
  {
    id: "cat-banners",
    code: "BANNER",
    categoryId: "banners",
    categoryName: "Баннеры",
    name: "Баннер широкоформатный",
    description: "Печать баннеров 440г / 510г литых с люверсами и проклейкой",
    unit: "м²",
    defaultRate: 35000,
    subServices: [
      {
        id: "sub-banner-print",
        code: "BANNER_PRINT_ONLY",
        categoryId: "banners",
        categoryName: "Баннеры",
        name: "Печать без каркаса",
        description: "Печать баннера с люверсами",
        unit: "м²",
        defaultRate: 30000,
      },
      {
        id: "sub-banner-frame",
        code: "BANNER_NEW_FRAME",
        categoryId: "banners",
        categoryName: "Баннеры",
        name: "Печать с новым каркасом",
        description: "Печать, изготовление металлокаркаса из профильной трубы 20х20 и натяжка",
        unit: "комплект",
        defaultRate: 50000,
      },
      {
        id: "sub-banner-replace",
        code: "BANNER_REPLACE_FABRIC",
        categoryId: "banners",
        categoryName: "Баннеры",
        name: "Замена полотна на существующем каркасе",
        description: "Демонтаж старого полотна и натяжка нового баннера без изготовления каркаса",
        unit: "м²",
        defaultRate: 32000,
      },
    ],
  },
  {
    id: "cat-vinyl",
    code: "ORACAL",
    categoryId: "vinyl",
    categoryName: "Плёнка Oracal",
    name: "Самоклеящаяся плёнка",
    description: "Интерьерная и уличная печать на пленке, ламинация и плоттерная резка",
    unit: "м²",
    defaultRate: 40000,
    subServices: [
      {
        id: "sub-vinyl-print",
        code: "VINYL_PRINT",
        categoryId: "vinyl",
        categoryName: "Плёнка Oracal",
        name: "Печать на плёнке",
        unit: "м²",
        defaultRate: 40000,
      },
      {
        id: "sub-vinyl-lam",
        code: "VINYL_LAMINATE",
        categoryId: "vinyl",
        categoryName: "Плёнка Oracal",
        name: "Защитная ламинация",
        unit: "м²",
        defaultRate: 20000,
      },
      {
        id: "sub-vinyl-cut",
        code: "VINYL_PLOTTER_CUT",
        categoryId: "vinyl",
        categoryName: "Плёнка Oracal",
        name: "Плоттерная резка и выборка",
        unit: "пог. м",
        defaultRate: 15000,
      },
      {
        id: "sub-vinyl-apply",
        code: "VINYL_APPLICATION",
        categoryId: "vinyl",
        categoryName: "Плёнка Oracal",
        name: "Монтаж (нанесение) плёнки",
        unit: "м²",
        defaultRate: 30000,
      },
      {
        id: "sub-vinyl-clean",
        code: "VINYL_GLUE_REMOVAL",
        categoryId: "vinyl",
        categoryName: "Плёнка Oracal",
        name: "Удаление старой плёнки и очистка клея",
        unit: "м² / объект",
        defaultRate: 50000,
      },
    ],
  },
  {
    id: "cat-stands",
    code: "STANDS",
    categoryId: "stands",
    categoryName: "Стенды",
    name: "Информационные стенды и уголки покупателя",
    description: "Акрил, ПВХ, карманы A4/A3, дистанционные держатели",
    unit: "шт",
    defaultRate: 200000,
  },
  {
    id: "cat-letters",
    code: "LETTERS_3D",
    categoryId: "letters",
    categoryName: "Объёмные и световые буквы",
    name: "Объёмные световые буквы",
    description: "Акрил 3мм, ПВХ борт, линзованные светодиодные модули IP67 Samsung",
    unit: "см высоты",
    isBundle: true,
    includedComponents: ["MODULES", "WIRING", "ASSEMBLY"],
    heightTariffs: [
      { minCm: 0, maxCm: 20, ratePerCm: 6500 },
      { minCm: 20, maxCm: 40, ratePerCm: 6000 },
      { minCm: 40, maxCm: 100, ratePerCm: 5500 },
    ],
  },
  {
    id: "cat-gold-letters",
    code: "GOLD_LETTERS",
    categoryId: "letters",
    categoryName: "Объёмные и световые буквы",
    name: "Золотые буквы (композит / зеркальный акрил)",
    description: "Премиальные буквы под золото, латунь или хром с задней подсветкой (контражур)",
    unit: "см высоты",
    heightTariffs: [
      { minCm: 0, maxCm: 20, ratePerCm: 8500 },
      { minCm: 20, maxCm: 40, ratePerCm: 8000 },
      { minCm: 40, maxCm: 100, ratePerCm: 7500 },
    ],
  },
  {
    id: "cat-installation",
    code: "INSTALLATION_WORK",
    categoryId: "installation",
    categoryName: "Монтаж и спецтехника",
    name: "Выездной монтаж наружной рекламы",
    description: "Установка вывесок, баннеров, оклейка витрин, работа на высоте",
    unit: "выезд",
    defaultRate: 150000,
  },
];
