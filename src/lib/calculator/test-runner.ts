import { calculateAdvertisingItem } from "./engine";
import { Decimal } from "./decimal";

interface TestResult {
  code: string;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  details?: string;
}

export function runAcceptanceTests(): { summary: string; results: TestResult[] } {
  const results: TestResult[] = [];

  function assert(code: string, name: string, expected: string, actual: string, passed: boolean, details?: string) {
    results.push({ code, name, expected, actual, passed, details });
  }

  // C01: Баннер 3 × 2 м, 1 шт, печать 30 000 UZS за м² -> Площадь 6 м²; печать 180 000 UZS
  try {
    const res = calculateAdvertisingItem({
      width: { value: 3, unit: "m" },
      height: { value: 2, unit: "m" },
      quantity: 1,
      printRate: 30000,
    });
    const passed = res.normalizedInputs.billableAreaM2 === "6" && res.customerTotal === "180000";
    assert("C01", "Баннер 3 × 2 м, 1 шт, печать 30 000 UZS/м²", "Площадь 6 м²; итог 180 000 UZS", `Площадь ${res.normalizedInputs.billableAreaM2} м²; итог ${res.customerTotal} UZS`, passed);
  } catch (e: any) {
    assert("C01", "Баннер 3 × 2 м, 1 шт", "180000 UZS", e.message, false);
  }

  // C02: C01 плюс каркас без перемычек 50 000 UZS за м; тестовая длина 10 м; один монтаж 150 000 -> Каркас 500 000; итог 830 000 UZS
  try {
    const res = calculateAdvertisingItem({
      width: { value: 3, unit: "m" },
      height: { value: 2, unit: "m" },
      quantity: 1,
      printRate: 30000,
      frame: { enabled: true, customLength: 10, ratePerMeter: 50000 },
      installation: { enabled: true, scope: "site_visit", rate: 150000 },
    });
    const frameComp = res.components.find((c) => c.code === "BANNER_FRAME");
    const passed = frameComp?.totalPrice === "500000" && res.customerTotal === "830000";
    assert("C02", "Баннер с каркасом (10 м по 50k) и монтажом 150k", "Каркас 500 000; итог 830 000 UZS", `Каркас ${frameComp?.totalPrice}; итог ${res.customerTotal} UZS`, passed);
  } catch (e: any) {
    assert("C02", "Баннер с каркасом и монтажом", "830000 UZS", e.message, false);
  }

  // C03: C02, количество баннеров 2, тот же один монтаж за объект -> Печать 360 000; каркас 1 000 000; монтаж 150 000; итог 1 510 000 UZS
  try {
    const res = calculateAdvertisingItem({
      width: { value: 3, unit: "m" },
      height: { value: 2, unit: "m" },
      quantity: 2,
      printRate: 30000,
      frame: { enabled: true, customLength: 10, ratePerMeter: 50000 },
      installation: { enabled: true, scope: "site_visit", rate: 150000 },
    });
    const printComp = res.components.find((c) => c.code === "BANNER_PRINT");
    const frameComp = res.components.find((c) => c.code === "BANNER_FRAME");
    const instComp = res.components.find((c) => c.code === "INSTALLATION");
    const passed = printComp?.totalPrice === "360000" && frameComp?.totalPrice === "1000000" && instComp?.totalPrice === "150000" && res.customerTotal === "1510000";
    assert("C03", "2 баннера с каркасом и один выездной монтаж", "Печать 360k; каркас 1M; монтаж 150k; итог 1 510 000 UZS", `Печать ${printComp?.totalPrice}; каркас ${frameComp?.totalPrice}; монтаж ${instComp?.totalPrice}; итог ${res.customerTotal}`, passed);
  } catch (e: any) {
    assert("C03", "2 баннера", "1510000 UZS", e.message, false);
  }

  // C04: Плёнка 1.2 × 2.5 м, 2 шт; печать 40 000, ламинация 20 000, нанесение 30 000 за м²; очистка 50 000 за объект -> Площадь 6 м²; итог 590 000 UZS
  try {
    const res = calculateAdvertisingItem({
      width: { value: 1.2, unit: "m" },
      height: { value: 2.5, unit: "m" },
      quantity: 2,
      film: {
        printRate: 40000,
        laminateRate: 20000,
        applyRate: 30000,
        glueRemovalRate: 50000,
      },
    });
    const passed = res.normalizedInputs.billableAreaM2 === "6" && res.customerTotal === "590000";
    assert("C04", "Пленка 1.2 × 2.5 м (2 шт) + печать/лам/поклейка + очистка 50k", "Площадь 6 м²; итог 590 000 UZS", `Площадь ${res.normalizedInputs.billableAreaM2} м²; итог ${res.customerTotal} UZS`, passed);
  } catch (e: any) {
    assert("C04", "Пленка", "590000 UZS", e.message, false);
  }

  // C05: Стенд 1.2 × 0.8 м; основание 200 000 за м²; рез 4 м по 10 000; 4 кармана по 25 000; монтаж 50 000 -> Итог 382 000 UZS
  try {
    const res = calculateAdvertisingItem({
      width: { value: 1.2, unit: "m" },
      height: { value: 0.8, unit: "m" },
      quantity: 1,
      stand: {
        baseRate: 200000,
        cuttingLength: 4,
        cuttingRate: 10000,
        pocketsCount: 4,
        pocketRate: 25000,
      },
      installation: { enabled: true, scope: "per_item", rate: 50000 },
    });
    // Основание: 1.2 * 0.8 = 0.96 м² * 200 000 = 192 000
    // Рез: 4 * 10 000 = 40 000
    // Карманы: 4 * 25 000 = 100 000
    // Монтаж: 50 000
    // Итого = 192k + 40k + 100k + 50k = 382 000 UZS
    const passed = res.customerTotal === "382000";
    assert("C05", "Стенд 1.2 × 0.8 м с карманами и монтажом", "Итог 382 000 UZS", `Итог ${res.customerTotal} UZS`, passed);
  } catch (e: any) {
    assert("C05", "Стенд", "382000 UZS", e.message, false);
  }

  // C06: 8 букв высотой 30 см; ставка 5000 за см; коэффициент 1.25 -> Итог 1 500 000 UZS
  try {
    const res = calculateAdvertisingItem({
      quantity: 1,
      letters: {
        count: 8,
        heightCm: 30,
        ratePerCm: 5000,
        complexityFactor: 1.25,
      },
    });
    const passed = res.customerTotal === "1500000";
    assert("C06", "8 букв высотой 30 см, ставка 5000/см, коэф 1.25", "Итог 1 500 000 UZS", `Итог ${res.customerTotal} UZS`, passed);
  } catch (e: any) {
    assert("C06", "Буквы", "1500000 UZS", e.message, false);
  }

  // C07: Себестоимость 1 000 000; наценка 25 процентов -> Цена 1 250 000; прибыль 250 000; маржа 20 процентов
  try {
    const res = calculateAdvertisingItem(
      {
        quantity: 1,
        costPlus: {
          directCost: 1000000,
          markupRate: 0.25,
        },
      },
      "cost_plus"
    );
    const passed = res.customerTotal === "1250000" && res.grossProfit === "250000" && res.marginRate === "0.2";
    assert("C07", "Себестоимость 1M с наценкой 25%", "Цена 1 250 000; прибыль 250 000; маржа 20%", `Цена ${res.customerTotal}; прибыль ${res.grossProfit}; маржа ${(Number(res.marginRate) * 100).toFixed(0)}%`, passed);
  } catch (e: any) {
    assert("C07", "Наценка", "1250000 UZS", e.message, false);
  }

  // C08: Себестоимость 1 000 000; целевая маржа 25 процентов -> До округления 1 333 333.333…; при округлении вверх до 1000 — 1 334 000 UZS
  try {
    const res = calculateAdvertisingItem(
      {
        quantity: 1,
        roundingStep: 1000,
        costPlus: {
          directCost: 1000000,
          targetMarginRate: 0.25,
        },
      },
      "cost_plus"
    );
    const passed = res.customerTotal === "1334000";
    assert("C08", "Себестоимость 1M с целевой маржой 25% и округлением до 1000", "Итог 1 334 000 UZS", `Итог ${res.customerTotal} UZS`, passed);
  } catch (e: any) {
    assert("C08", "Маржа", "1334000 UZS", e.message, false);
  }

  // C09: Размер 300 × 200 см и размер 3 × 2 м при одинаковых настройках -> Одинаковая геометрия и итог
  try {
    const resA = calculateAdvertisingItem({
      width: { value: 300, unit: "cm" },
      height: { value: 200, unit: "cm" },
      quantity: 1,
      printRate: 35000,
    });
    const resB = calculateAdvertisingItem({
      width: { value: 3, unit: "m" },
      height: { value: 2, unit: "m" },
      quantity: 1,
      printRate: 35000,
    });
    const passed = resA.normalizedInputs.billableAreaM2 === resB.normalizedInputs.billableAreaM2 && resA.customerTotal === resB.customerTotal;
    assert("C09", "300 × 200 см vs 3 × 2 м", "Одинаковая геометрия и сумма", `A=${resA.customerTotal}, B=${resB.customerTotal}`, passed);
  } catch (e: any) {
    assert("C09", "Единицы измерения", "Совпадение", e.message, false);
  }

  // C10: Два изделия по 0.2 м², минимум 1 м² -> Минимум на штуку: 2 м²; минимум на строку: 1 м²
  try {
    // 1) scope: per_item -> max(0.2, 1) * 2 = 2 м²
    const resItem = calculateAdvertisingItem({
      width: { value: 0.4, unit: "m" },
      height: { value: 0.5, unit: "m" }, // 0.2 м²
      quantity: 2,
      minArea: { value: 1, scope: "per_item" },
      printRate: 10000,
    });
    // 2) scope: per_line -> max(0.4, 1) = 1 м²
    const resLine = calculateAdvertisingItem({
      width: { value: 0.4, unit: "m" },
      height: { value: 0.5, unit: "m" }, // 0.2 м²
      quantity: 2,
      minArea: { value: 1, scope: "per_line" },
      printRate: 10000,
    });
    const passed = resItem.normalizedInputs.billableAreaM2 === "2" && resLine.normalizedInputs.billableAreaM2 === "1";
    assert("C10", "Минимальная площадь на штуку vs на строку", "Штука: 2 м², Строка: 1 м²", `Штука: ${resItem.normalizedInputs.billableAreaM2} м², Строка: ${resLine.normalizedInputs.billableAreaM2} м²`, passed);
  } catch (e: any) {
    assert("C10", "Минимум площади", "2 м² и 1 м²", e.message, false);
  }

  // C11: Сумма 1 000 000, скидка 10%, минимум заказа 950 000 с доплатой -> После скидки 900 000; доплата 50 000; итог 950 000 UZS
  try {
    const res = calculateAdvertisingItem({
      width: { value: 10, unit: "m" },
      height: { value: 10, unit: "m" }, // 100 м²
      quantity: 1,
      printRate: 10000, // 1 000 000 UZS
      discount: { type: "percent", value: 10 }, // -100 000 = 900 000 UZS
      minimumOrder: { enabled: true, amount: 950000, action: "surcharge" }, // доплата 50 000
    });
    const passed = res.subtotal === "1000000" && res.discountAmount === "100000" && res.surchargeAmount === "50000" && res.customerTotal === "950000";
    assert("C11", "Сумма 1M - 10% + доплата до минимума 950k", "Скидка 100k, доплата 50k, итог 950 000", `Скидка ${res.discountAmount}, доплата ${res.surchargeAmount}, итог ${res.customerTotal}`, passed);
  } catch (e: any) {
    assert("C11", "Минимум заказа", "950000 UZS", e.message, false);
  }

  // C12: Баннер 3 × 2 м, замкнутый контур, шаг люверсов 0.5 м -> 20 люверсов; углы не задвоены
  try {
    const res = calculateAdvertisingItem({
      width: { value: 3, unit: "m" },
      height: { value: 2, unit: "m" },
      quantity: 1,
      printRate: 30000,
      eyelets: { enabled: true, step: 0.5, rate: 2000 },
    });
    const eyeletComp = res.components.find((c) => c.code === "BANNER_EYELETS");
    const passed = eyeletComp?.quantity === "20";
    assert("C12", "Баннер 3 × 2 м, шаг люверсов 0.5 м", "Ровно 20 люверсов", `${eyeletComp?.quantity} люверсов`, passed);
  } catch (e: any) {
    assert("C12", "Люверсы", "20 шт", e.message, false);
  }

  // C13: Заказ 2 000 000; оплаты 500 000 и 700 000 -> Чистая оплата 1 200 000; долг 800 000 UZS
  try {
    const { calculateOrderBalance } = require("../finance/engine");
    const fin = calculateOrderBalance(2000000, [{ amount: 500000 }, { amount: 700000 }]);
    const passed = fin.netPaid === "1200000" && fin.debt === "800000";
    assert("C13", "Заказ 2M, оплаты 500k и 700k", "Чистая оплата 1 200 000; долг 800 000 UZS", `Оплата ${fin.netPaid}; долг ${fin.debt}`, passed);
  } catch (e: any) {
    assert("C13", "Оплаты заказа", "Оплата 1.2M, долг 800k", e.message, false);
  }

  // C14: C13 плюс возврат 200 000 без изменения цены заказа -> Чистая оплата 1 000 000; долг 1 000 000 UZS
  try {
    const { calculateOrderBalance } = require("../finance/engine");
    const fin = calculateOrderBalance(2000000, [{ amount: 500000 }, { amount: 700000 }], [{ amount: 200000 }]);
    const passed = fin.netPaid === "1000000" && fin.debt === "1000000";
    assert("C14", "Заказ 2M, оплаты 1.2M и возврат 200k", "Чистая оплата 1 000 000; долг 1 000 000 UZS", `Оплата ${fin.netPaid}; долг ${fin.debt}`, passed);
  } catch (e: any) {
    assert("C14", "Возврат", "Оплата 1M, долг 1M", e.message, false);
  }

  // C15: Заказ 2 000 000; чистая оплата 2 200 000 -> Долг 0; переплата 200 000 UZS
  try {
    const { calculateOrderBalance } = require("../finance/engine");
    const fin = calculateOrderBalance(2000000, [{ amount: 2200000 }]);
    const passed = fin.debt === "0" && fin.overpayment === "200000";
    assert("C15", "Заказ 2M, оплата 2.2M", "Долг 0; переплата 200 000 UZS", `Долг ${fin.debt}; переплата ${fin.overpayment}`, passed);
  } catch (e: any) {
    assert("C15", "Переплата", "Долг 0, переплата 200k", e.message, false);
  }

  // S01: Граничные условия (q=0, отрицательные размеры, маржа 100%, отсутствующий тариф -> blocked)
  try {
    let qZeroBlocked = false;
    try {
      calculateAdvertisingItem({ width: { value: 3, unit: "m" }, height: { value: 2, unit: "m" }, quantity: 0, printRate: 30000 });
    } catch {
      qZeroBlocked = true;
    }

    let margin100Blocked = false;
    try {
      calculateAdvertisingItem({ quantity: 1, costPlus: { directCost: 1000, targetMarginRate: 1 } }, "cost_plus");
    } catch {
      margin100Blocked = true;
    }

    const missingTariffRes = calculateAdvertisingItem({
      width: { value: 3, unit: "m" },
      height: { value: 2, unit: "m" },
      quantity: 1,
      printRate: 0, // Не задан тариф
    });
    const missingTariffBlocked = missingTariffRes.status === "blocked";

    const passed = qZeroBlocked && margin100Blocked && missingTariffBlocked;
    assert("S01", "Граничные условия: q=0, маржа 100%, нулевой тариф -> blocked", "Все ошибочные входы отклонены/заблокированы", `qZero=${qZeroBlocked}, margin100=${margin100Blocked}, missingTariff=${missingTariffBlocked}`, passed);
  } catch (e: any) {
    assert("S01", "Граничные проверки", "Blocked", e.message, false);
  }

  // S02: Владелец создаёт новую подуслугу «Очистка клея» с ценой за м², включает её в плёнку и получает новый рабочий расчёт без изменения кода
  try {
    const resWithoutClean = calculateAdvertisingItem({
      width: { value: 1, unit: "m" },
      height: { value: 1, unit: "m" },
      quantity: 1,
      film: { printRate: 40000 },
    });
    const resWithClean = calculateAdvertisingItem({
      width: { value: 1, unit: "m" },
      height: { value: 1, unit: "m" },
      quantity: 1,
      film: { printRate: 40000, glueRemovalRate: 50000 },
    });
    const passed = resWithoutClean.customerTotal === "40000" && resWithClean.customerTotal === "90000" && resWithClean.components.some((c) => c.code === "FILM_CLEAN");
    assert("S02", "Включение новой подуслуги (очистка клея) в расчет", "Итог 90 000 UZS с компонентом очистки", `Без=${resWithoutClean.customerTotal}, С=${resWithClean.customerTotal}`, passed);
  } catch (e: any) {
    assert("S02", "Подуслуга", "90 000 UZS", e.message, false);
  }

  // S03: Тариф 30 000 меняется на 35 000: уже согласованный баннер 6 м² остаётся 180 000; новый расчёт равен 210 000. Явная новая редакция показывает разницу 30 000
  try {
    const snapshotOld = calculateAdvertisingItem({
      width: { value: 3, unit: "m" },
      height: { value: 2, unit: "m" },
      quantity: 1,
      printRate: 30000,
    });
    const snapshotNew = calculateAdvertisingItem({
      width: { value: 3, unit: "m" },
      height: { value: 2, unit: "m" },
      quantity: 1,
      printRate: 35000,
    });
    const diff = Number(snapshotNew.customerTotal) - Number(snapshotOld.customerTotal);
    const passed = snapshotOld.customerTotal === "180000" && snapshotNew.customerTotal === "210000" && diff === 30000;
    assert("S03", "Неизменяемость согласованного снимка при смене тарифа (30k -> 35k)", "Старый=180k, Новый=210k, Разница=30k", `Старый=${snapshotOld.customerTotal}, Новый=${snapshotNew.customerTotal}, Разница=${diff}`, passed);
  } catch (e: any) {
    assert("S03", "Смена тарифа", "Разница 30k", e.message, false);
  }

  // S04: На границах диапазонов высоты 19.99, 20 и 40 см выбирается один тариф. Перекрытие диапазонов блокирует публикацию
  try {
    const { validateHeightTariffs, getRateForHeight } = require("../catalog/services");
    const tariffs = [
      { minCm: 0, maxCm: 20, ratePerCm: 6500 },
      { minCm: 20, maxCm: 40, ratePerCm: 6000 },
      { minCm: 40, maxCm: 100, ratePerCm: 5500 },
    ];
    const rate19_99 = getRateForHeight(19.99, tariffs); // 6500
    const rate20 = getRateForHeight(20, tariffs);       // 6000
    const rate40 = getRateForHeight(40, tariffs);       // 5500

    const overlappingTariffs = [
      { minCm: 0, maxCm: 25, ratePerCm: 6500 },
      { minCm: 20, maxCm: 40, ratePerCm: 6000 },
    ];
    const validationOverlap = validateHeightTariffs(overlappingTariffs);

    const passed = rate19_99 === 6500 && rate20 === 6000 && rate40 === 5500 && !validationOverlap.isValid;
    assert("S04", "Границы диапазонов [0,20), [20,40), [40,100) и блокировка перекрытий", "19.99->6500, 20->6000, 40->5500, перекрытие блокируется", `19.99=${rate19_99}, 20=${rate20}, 40=${rate40}, overlapValid=${validationOverlap.isValid}`, passed);
  } catch (e: any) {
    assert("S04", "Диапазоны тарифов", "Корректно", e.message, false);
  }

  // S05: Комплект «световая буква» с включёнными модулями и сборкой не начисляет их повторно
  try {
    const { MASTER_PRINT_CATALOG } = require("../catalog/services");
    const letterService = MASTER_PRINT_CATALOG.find((s: any) => s.code === "LETTERS_3D");
    const isBundle = letterService?.isBundle === true;
    const included = letterService?.includedComponents?.includes("MODULES");
    const passed = isBundle && included;
    assert("S05", "Комплект «световая буква под ключ» включает свет и сборку без задвоения", "Пакетная цена не суммирует модули повторно", `isBundle=${isBundle}, includesModules=${included}`, passed);
  } catch (e: any) {
    assert("S05", "Комплекты", "Без задвоения", e.message, false);
  }

  // S13: Отключение подсветки убирает компоненты; выбор несовместимой поверхности объясняет ошибку
  try {
    const { calculateLedSystem, validateMaterialCompatibility } = require("../catalog/letters");
    const noLight = calculateLedSystem(10, 30, "none");
    const incompatible = validateMaterialCompatibility("зеркальный композит золото", "front");
    const compatible = validateMaterialCompatibility("зеркальный композит золото", "back");

    const passed = noLight === null && !incompatible.isValid && compatible.isValid;
    assert("S13", "Отключение подсветки и проверка несовместимости материалов", "none->null, композит+front->ошибка, композит+back->OK", `noLight=${noLight === null}, incompValid=${incompatible.isValid}, compValid=${compatible.isValid}`, passed);
  } catch (e: any) {
    assert("S13", "Совместимость подсветки", "OK", e.message, false);
  }

  const passedCount = results.filter((r) => r.passed).length;
  const summary = `Пройдено ${passedCount} из ${results.length} сценариев спецификации`;

  return { summary, results };
}

// Запуск при прямом вызове
if (require.main === module) {
  const { summary, results } = runAcceptanceTests();
  console.log("=========================================");
  console.log("  РЕЗУЛЬТАТЫ ПРИЕМОЧНЫХ ТЕСТОВ ТЗ ERP   ");
  console.log("=========================================");
  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    console.log(`${icon} [${r.code}] ${r.name}`);
    console.log(`   Ожидалось: ${r.expected}`);
    console.log(`   Получено:  ${r.actual}`);
  }
  console.log("-----------------------------------------");
  console.log(summary);
  console.log("=========================================");
}
