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
    categoryName: "Стенды и таблички",
    name: "Стенды (оргстекло / Фомекс ПВХ)",
    description: "Информационные стенды и вывески из оргстекла (акрила) на дистанционных держателях или вспененного ПВХ Фомекса (3/5/8/10 мм) с интерьерной печатью, карманами и профилем.",
    unit: "м²",
    defaultRate: 240000,
    subServices: [
      {
        id: "sub-acrylic-stand",
        code: "STAND_ACRYLIC",
        categoryId: "stands",
        categoryName: "Стенды и таблички",
        name: "Стенд из оргстекла (акрила) на держателях",
        description: "Прозрачное или матовое оргстекло (акрил 3-5мм), УФ-печать / накатка сзади, дистанционные держатели",
        unit: "м²",
        defaultRate: 350000,
      },
      {
        id: "sub-fomeks-3mm",
        code: "STAND_FOMEKS_3MM",
        categoryId: "stands",
        categoryName: "Стенды и таблички",
        name: "Стенд из Фомекса 3 мм + накатка Oracal",
        description: "Основа ПВХ Фомекс 3мм с интерьерной печатью и ламинацией",
        unit: "м²",
        defaultRate: 220000,
      },
      {
        id: "sub-fomeks-5mm",
        code: "STAND_FOMEKS_5MM",
        categoryId: "stands",
        categoryName: "Стенды из Фомекса",
        name: "Стенд из Фомекса 5 мм + накатка Oracal",
        description: "Основа ПВХ Фомекс 5мм усиленная с полноцветной накаткой",
        unit: "м²",
        defaultRate: 260000,
      },
      {
        id: "sub-fomeks-8mm",
        code: "STAND_FOMEKS_8MM",
        categoryId: "stands",
        categoryName: "Стенды из Фомекса",
        name: "Стенд из Фомекса 8-10 мм премиум",
        description: "Толстый прочный фомекс 8-10мм для крупных уличных и интерьерных стендов",
        unit: "м²",
        defaultRate: 320000,
      },
      {
        id: "sub-fomeks-pockets-a4",
        code: "STAND_POCKET_A4",
        categoryId: "stands",
        categoryName: "Стенды из Фомекса",
        name: "Карман прозрачный А4 (ПЭТ / акрил)",
        description: "Плоский или объемный карман формата А4 на скотче 3M",
        unit: "шт",
        defaultRate: 25000,
      },
      {
        id: "sub-fomeks-pockets-a3",
        code: "STAND_POCKET_A3",
        categoryId: "stands",
        categoryName: "Стенды из Фомекса",
        name: "Карман прозрачный А3",
        description: "Широкоформатный прозрачный карман формата А3",
        unit: "шт",
        defaultRate: 40000,
      },
      {
        id: "sub-fomeks-profile-nielsen",
        code: "STAND_PROFILE_NIELSEN",
        categoryId: "stands",
        categoryName: "Стенды из Фомекса",
        name: "Алюминиевый багетный профиль Nielsen",
        description: "Обрамление стенда по периметру алюминиевым багетом (матовое серебро/золото)",
        unit: "пог. м",
        defaultRate: 40000,
      },
      {
        id: "sub-fomeks-remote-mounts",
        code: "STAND_REMOTE_MOUNTS",
        categoryId: "stands",
        categoryName: "Стенды из Фомекса",
        name: "Дистанционные металлические держатели",
        description: "Крепление стенда на расстоянии от стены со стальными хромированными шляпками",
        unit: "шт",
        defaultRate: 15000,
      },
    ],
  },
  {
    id: "cat-lightbox",
    code: "LIGHTBOX",
    categoryId: "lightboxes",
    categoryName: "Световые короба",
    name: "Изготовление короба из акрила (свет)",
    description: "Световой короб (лайтбокс) из светорассеивающего акрила с LED подсветкой. Сумма за м² задается вручную.",
    unit: "м²",
    defaultRate: 850000,
    subServices: [
      {
        id: "sub-lightbox-acrylic-modules",
        code: "LIGHTBOX_ACRYLIC_LED",
        categoryId: "lightboxes",
        categoryName: "Световые короба",
        name: "Короб из акрила с LED модулями 12V",
        description: "Лицевая панель светорассеивающий молочный акрил Plexiglas, диоды линзованные IP67, блок питания",
        unit: "м²",
        defaultRate: 850000,
      },
      {
        id: "sub-lightbox-profile-alu",
        code: "LIGHTBOX_ALU_PROFILE",
        categoryId: "lightboxes",
        categoryName: "Световые короба",
        name: "Алюминиевый профиль для короба",
        description: "Профиль клик/квадро с порошковой покраской",
        unit: "пог. м",
        defaultRate: 65000,
      },
      {
        id: "sub-lightbox-strip",
        code: "LIGHTBOX_LED_STRIP",
        categoryId: "lightboxes",
        categoryName: "Световые короба",
        name: "Короб из акрила (LED лента)",
        description: "Облегченная интерьерная подсветка светодиодной лентой повышенной плотности",
        unit: "м²",
        defaultRate: 750000,
      },
    ],
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
