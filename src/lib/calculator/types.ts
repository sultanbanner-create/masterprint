export type UnitType = "mm" | "cm" | "m" | "sqm" | "lm" | "pcs" | "hour" | "point";

export type PricingMode = "tariff" | "cost_plus";

export type CalculationStatus = "preliminary" | "ready" | "blocked";

export interface DimensionInput {
  value: string | number;
  unit: "mm" | "cm" | "m";
}

export interface CalculationParameterInputs {
  width?: DimensionInput;
  height?: DimensionInput;
  quantity?: number;
  bleed?: DimensionInput; // припуск b
  minArea?: { value: string | number; scope: "per_item" | "per_line" };
  
  // Баннеры
  materialType?: string;
  printRate?: string | number;
  edgeProcessing?: boolean;
  edgeRate?: string | number;
  eyelets?: {
    enabled: boolean;
    step?: number; // шаг в метрах, по умолч. 0.5м
    sides?: "all" | "perimeter" | "top_bottom" | "left_right";
    customCount?: number;
    rate?: string | number;
  };
  frame?: {
    enabled: boolean;
    ratePerMeter?: string | number;
    customLength?: string | number;
    horizontalCount?: number;
    verticalCount?: number;
  };

  // Монтаж и работы
  installation?: {
    enabled: boolean;
    scope: "per_item" | "site_visit";
    rate?: string | number;
    heightFactor?: string | number;
    equipmentCost?: string | number; // автовышка/подъемник
    transportCost?: string | number;
  };

  // Пленка Oracal
  film?: {
    type?: string;
    printRate?: string | number;
    laminateRate?: string | number;
    cutLength?: string | number; // метры контурного реза
    cutRate?: string | number;
    applyRate?: string | number;
    surfacePrepRate?: string | number;
    glueRemovalRate?: string | number;
  };

  // Стенды (Стенд из Фомекса ПВХ / Оргстекла / Акрила)
  stand?: {
    material?: "acrylic" | "fomeks" | string; // оргстекло (акрил) или фомекс (ПВХ)
    ratePerSqm?: string | number; // ручной ввод ставки за кв. метр Фомекса (по умолч. 240 000 UZS)
    thickness?: "3mm" | "5mm" | "8mm" | "10mm" | string; // толщина фомекса
    baseRate?: string | number; // базовая ставка за м² (обратная совместимость C05)
    pocketsA4Count?: number; // карманы формата А4 (шт)
    pocketsA4Rate?: string | number; // тариф кармана А4 (по умолч. 25 000 UZS)
    pocketsA3Count?: number; // карманы формата А3 (шт)
    pocketsA3Rate?: string | number; // тариф кармана А3 (по умолч. 40 000 UZS)
    pocketsCount?: number; // кол-во карманов (обратная совместимость)
    pocketRate?: string | number; // тариф кармана (обратная совместимость)
    profileType?: "none" | "nielsen" | "plastic_edge"; // багетный профиль Nielsen или кант
    profileRate?: string | number; // тариф за пог. м багетного профиля (по умолч. 40 000 UZS)
    fittingsCount?: number; // дистанционные металлические держатели (шт)
    fittingsRate?: string | number; // тариф держателя (по умолч. 15 000 UZS)
    graphicsRate?: string | number;
    cuttingLength?: string | number;
    cuttingRate?: string | number;
    assemblyRate?: string | number;
  };

  // Буквы
  letters?: {
    text?: string;
    count?: number;
    heightCm?: string | number;
    ratePerCm?: string | number;
    complexityFactor?: string | number;
    lightingType?: "none" | "front" | "back" | "double";
    ledModuleRate?: string | number;
    powerSupplyRate?: string | number;
  };

  // Короба из акрила (свет)
  lightbox?: {
    ratePerSqm: string | number; // сумма за квадратный метр (вручную)
    lightingType?: "led_modules" | "led_strip" | "none";
    lightingRate?: string | number;
    profileType?: "acrylic_side" | "aluminum" | "pvc";
    profileRate?: string | number;
  };

  // Подробный режим (Cost Plus)
  costPlus?: {
    directCost: string | number;
    markupRate?: string | number; // 0.25 для 25%
    targetMarginRate?: string | number; // 0.25 для 25%
  };

  // Скидки, минимумы, налоги, округление
  discount?: {
    type: "percent" | "fixed";
    value: string | number;
  };
  minimumOrder?: {
    enabled: boolean;
    amount: string | number;
    action: "warn" | "block" | "surcharge";
  };
  tax?: {
    enabled: boolean;
    rate: string | number; // 0.12 для 12%
    mode: "add_on_top" | "included";
  };
  roundingStep?: number; // 1, 100, 1000 UZS
}

export interface CalculationComponent {
  code: string;
  name: string;
  unit: string;
  quantity: string; // строковый Decimal
  unitPrice: string; // строковый Decimal
  totalPrice: string; // строковый Decimal
  isIncludedInPackage?: boolean;
  scope: "item" | "line" | "site_visit" | "order";
  plannedCost?: string; // виден только при наличии прав
}

export interface CalculationResult {
  status: CalculationStatus;
  normalizedInputs: {
    widthM: string;
    heightM: string;
    quantity: number;
    areaOneM2: string;
    areaTotalM2: string;
    billableAreaM2: string;
    perimeterOneM: string;
    perimeterTotalM: string;
  };
  components: CalculationComponent[];
  subtotal: string;
  discountAmount: string;
  surchargeAmount: string;
  taxAmount: string;
  customerTotal: string; // Итог клиенту
  plannedCostTotal?: string; // Себестоимость (права)
  grossProfit?: string; // Прибыль (права)
  marginRate?: string; // Маржа (права)
  warnings: string[];
  missingFields: string[];
  calculationToken: string;
}
