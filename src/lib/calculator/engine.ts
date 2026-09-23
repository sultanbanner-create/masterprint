import { Decimal, toMeters, parseDecimal, roundToStep } from "./decimal";
import { 
  CalculationParameterInputs, 
  CalculationResult, 
  CalculationComponent, 
  PricingMode, 
  CalculationStatus 
} from "./types";
import crypto from "crypto";

export function calculateAdvertisingItem(
  params: CalculationParameterInputs,
  mode: PricingMode = "tariff",
  userPermissions: { canViewCost?: boolean } = { canViewCost: true }
): CalculationResult {
  const warnings: string[] = [];
  const missingFields: string[] = [];
  let status: CalculationStatus = "ready";

  // 1. Проверка количества изделий (q)
  if (params.quantity === undefined || params.quantity === null) {
    missingFields.push("quantity");
    status = "blocked";
  } else if (!Number.isInteger(params.quantity) || params.quantity <= 0) {
    throw new Error("Количество изделий (q) должно быть целым положительным числом больше нуля");
  }
  const q = params.quantity || 1;
  const qDec = new Decimal(q);

  // 2. Нормализация размеров (W и H)
  let wM = new Decimal(0);
  let hM = new Decimal(0);

  // Для букв размеры могут задаваться через высоту текста
  const isLetters = !!params.letters;

  if (!isLetters) {
    if (!params.width || !params.width.value) {
      missingFields.push("width");
      status = "blocked";
    } else {
      wM = toMeters(params.width);
      if (wM.isZero() || wM.isNegative()) {
        throw new Error("Ширина должна быть строго больше нуля");
      }
    }

    if (!params.height || !params.height.value) {
      missingFields.push("height");
      status = "blocked";
    } else {
      hM = toMeters(params.height);
      if (hM.isZero() || hM.isNegative()) {
        throw new Error("Высота должна быть строго больше нуля");
      }
    }
  }

  // Припуск b (bleed)
  const bM = params.bleed ? toMeters(params.bleed) : new Decimal(0);

  // Базовая геометрия
  const areaOne = wM.times(hM);
  const areaTotal = areaOne.times(qDec);
  const perimeterOne = new Decimal(2).times(wM.plus(hM));
  const perimeterTotal = perimeterOne.times(qDec);

  // 3. Расчет оплачиваемой площади (с учетом минимальной площади C10)
  let billableArea = areaTotal;
  if (params.minArea && params.minArea.value) {
    const minAreaDec = parseDecimal(params.minArea.value);
    if (params.minArea.scope === "per_item") {
      // billable_area = max(area_one, min_area) * q
      const billableOne = Decimal.max(areaOne, minAreaDec);
      billableArea = billableOne.times(qDec);
    } else {
      // billable_area = max(area_total, min_area)
      billableArea = Decimal.max(areaTotal, minAreaDec);
    }
  }

  const components: CalculationComponent[] = [];

  // 4. Подробный режим: себестоимость + наценка/маржа (C07, C08)
  if (mode === "cost_plus") {
    if (!params.costPlus || !params.costPlus.directCost) {
      missingFields.push("costPlus.directCost");
      status = "blocked";
      return buildResult(status, wM, hM, q, areaOne, areaTotal, billableArea, perimeterOne, perimeterTotal, components, new Decimal(0), new Decimal(0), new Decimal(0), new Decimal(0), new Decimal(0), warnings, missingFields, userPermissions);
    }

    const cost = parseDecimal(params.costPlus.directCost);
    let customerTotal = cost;

    if (params.costPlus.markupRate !== undefined) {
      // price_with_markup = cost * (1 + markup_rate)
      const markupRate = parseDecimal(params.costPlus.markupRate);
      customerTotal = cost.times(new Decimal(1).plus(markupRate));
    } else if (params.costPlus.targetMarginRate !== undefined) {
      // price_with_target_margin = cost / (1 - margin_rate)
      const marginRate = parseDecimal(params.costPlus.targetMarginRate);
      if (marginRate.greaterThanOrEqualTo(1)) {
        throw new Error("Целевая маржа должна быть строго меньше 1 (100%)");
      }
      customerTotal = cost.dividedBy(new Decimal(1).minus(marginRate));
    }

    components.push({
      code: "COST_PLUS_TOTAL",
      name: "Расчет от себестоимости с наценкой/маржой",
      unit: "заказ",
      quantity: "1",
      unitPrice: customerTotal.toString(),
      totalPrice: customerTotal.toString(),
      scope: "item",
      plannedCost: cost.toString(),
    });

    // Финальное округление (C08)
    const roundingStep = params.roundingStep || 1;
    const finalRoundedTotal = roundToStep(customerTotal, roundingStep, "up");

    const grossProfit = finalRoundedTotal.minus(cost);
    const calculatedMargin = finalRoundedTotal.isZero() ? new Decimal(0) : grossProfit.dividedBy(finalRoundedTotal);

    return buildResult(
      status, wM, hM, q, areaOne, areaTotal, billableArea, perimeterOne, perimeterTotal,
      components, customerTotal, new Decimal(0), new Decimal(0), new Decimal(0), finalRoundedTotal,
      warnings, missingFields, userPermissions,
      cost, grossProfit, calculatedMargin
    );
  }

  // 5. Тарифный режим
  // А. Баннеры (C01, C02, C03, C12)
  if (params.printRate !== undefined) {
    const pRate = parseDecimal(params.printRate);
    if (pRate.isZero()) {
      status = "blocked";
      missingFields.push("printRate (не задан тариф)");
    } else {
      const printTotal = billableArea.times(pRate);
      components.push({
        code: "BANNER_PRINT",
        name: `Печать баннера (${billableArea.toString()} м²)`,
        unit: "м²",
        quantity: billableArea.toString(),
        unitPrice: pRate.toString(),
        totalPrice: printTotal.toString(),
        scope: "item",
      });
    }

    // Обработка кромки
    if (params.edgeProcessing && params.edgeRate) {
      const edgeRate = parseDecimal(params.edgeRate);
      const edgeTotal = perimeterTotal.times(edgeRate);
      components.push({
        code: "BANNER_EDGE",
        name: "Обработка кромки (проварка/проклейка)",
        unit: "пог. м",
        quantity: perimeterTotal.toString(),
        unitPrice: edgeRate.toString(),
        totalPrice: edgeTotal.toString(),
        scope: "item",
      });
    }

    // Люверсы (C12)
    if (params.eyelets && params.eyelets.enabled) {
      let eyeletCount = 0;
      if (params.eyelets.customCount !== undefined) {
        eyeletCount = params.eyelets.customCount * q;
      } else {
        const step = params.eyelets.step || 0.5; // по умолчанию 50 см
        const stepDec = new Decimal(step);
        // Формула замкнутого прямоугольника без задвоения углов (C12):
        // 2*ceil(W/step) + 2*ceil(H/step)
        const countW = wM.dividedBy(stepDec).ceil().toNumber();
        const countH = hM.dividedBy(stepDec).ceil().toNumber();
        const oneItemCount = 2 * countW + 2 * countH;
        eyeletCount = oneItemCount * q;
      }

      const eyeletRate = parseDecimal(params.eyelets.rate || 0);
      const eyeletTotal = new Decimal(eyeletCount).times(eyeletRate);

      components.push({
        code: "BANNER_EYELETS",
        name: `Люверсы оцинкованные (${eyeletCount} шт)`,
        unit: "шт",
        quantity: eyeletCount.toString(),
        unitPrice: eyeletRate.toString(),
        totalPrice: eyeletTotal.toString(),
        scope: "item",
      });
    }

    // Каркас (C02, C03)
    if (params.frame && params.frame.enabled) {
      let frameLenOne = new Decimal(0);
      if (params.frame.customLength) {
        frameLenOne = parseDecimal(params.frame.customLength);
      } else {
        // Базовый периметр + перемычки: 2*(W+H) + hor*W + ver*H
        const hor = new Decimal(params.frame.horizontalCount || 0);
        const ver = new Decimal(params.frame.verticalCount || 0);
        frameLenOne = perimeterOne.plus(hor.times(wM)).plus(ver.times(hM));
      }

      const totalFrameLen = frameLenOne.times(qDec);
      const fRate = parseDecimal(params.frame.ratePerMeter || 0);
      if (fRate.isZero()) {
        status = "blocked";
        missingFields.push("frame.ratePerMeter (не задан тариф)");
      }
      const frameTotal = totalFrameLen.times(fRate);

      components.push({
        code: "BANNER_FRAME",
        name: `Металлокаркас профильный (${totalFrameLen.toString()} пог. м)`,
        unit: "пог. м",
        quantity: totalFrameLen.toString(),
        unitPrice: fRate.toString(),
        totalPrice: frameTotal.toString(),
        scope: "item",
      });
    }
  }

  // Б. Пленка Oracal (C04)
  if (params.film) {
    const f = params.film;
    if (f.printRate) {
      const pr = parseDecimal(f.printRate);
      const prTotal = billableArea.times(pr);
      components.push({
        code: "FILM_PRINT",
        name: "Печать на самоклеящейся пленке",
        unit: "м²",
        quantity: billableArea.toString(),
        unitPrice: pr.toString(),
        totalPrice: prTotal.toString(),
        scope: "item",
      });
    }
    if (f.laminateRate) {
      const lr = parseDecimal(f.laminateRate);
      const lrTotal = billableArea.times(lr);
      components.push({
        code: "FILM_LAMINATE",
        name: "Защитная ламинация пленки",
        unit: "м²",
        quantity: billableArea.toString(),
        unitPrice: lr.toString(),
        totalPrice: lrTotal.toString(),
        scope: "item",
      });
    }
    if (f.cutRate && f.cutLength) {
      const cl = parseDecimal(f.cutLength).times(qDec);
      const cr = parseDecimal(f.cutRate);
      const crTotal = cl.times(cr);
      components.push({
        code: "FILM_CUT",
        name: "Плоттерная резка по контуру",
        unit: "пог. м",
        quantity: cl.toString(),
        unitPrice: cr.toString(),
        totalPrice: crTotal.toString(),
        scope: "item",
      });
    }
    if (f.applyRate) {
      const ar = parseDecimal(f.applyRate);
      const arTotal = billableArea.times(ar);
      components.push({
        code: "FILM_APPLY",
        name: "Нанесение (оклейка) пленки",
        unit: "м²",
        quantity: billableArea.toString(),
        unitPrice: ar.toString(),
        totalPrice: arTotal.toString(),
        scope: "item",
      });
    }
    if (f.glueRemovalRate) {
      const gr = parseDecimal(f.glueRemovalRate);
      components.push({
        code: "FILM_CLEAN",
        name: "Демонтаж старой пленки и очистка клея",
        unit: "объект",
        quantity: "1",
        unitPrice: gr.toString(),
        totalPrice: gr.toString(),
        scope: "site_visit",
      });
    }
  }

  // В. Стенды из акрила и оргстекла (C05)
  if (params.stand) {
    const s = params.stand;
    if (s.baseRate) {
      const br = parseDecimal(s.baseRate);
      const brTotal = billableArea.times(br);
      components.push({
        code: "STAND_BASE",
        name: "Основание стенда (акрил/оргстекло)",
        unit: "м²",
        quantity: billableArea.toString(),
        unitPrice: br.toString(),
        totalPrice: brTotal.toString(),
        scope: "item",
      });
    }
    if (s.cuttingRate && s.cuttingLength) {
      const cl = parseDecimal(s.cuttingLength).times(qDec);
      const cr = parseDecimal(s.cuttingRate);
      const crTotal = cl.times(cr);
      components.push({
        code: "STAND_CUT",
        name: "Лазерная/фрезерная резка",
        unit: "пог. м",
        quantity: cl.toString(),
        unitPrice: cr.toString(),
        totalPrice: crTotal.toString(),
        scope: "item",
      });
    }
    if (s.pocketRate && s.pocketsCount) {
      const pc = new Decimal(s.pocketsCount).times(qDec);
      const pr = parseDecimal(s.pocketRate);
      const prTotal = pc.times(pr);
      components.push({
        code: "STAND_POCKETS",
        name: `Карманы объемные/плоские (${pc.toString()} шт)`,
        unit: "шт",
        quantity: pc.toString(),
        unitPrice: pr.toString(),
        totalPrice: prTotal.toString(),
        scope: "item",
      });
    }
    if (s.fittingsRate && s.fittingsCount) {
      const fc = new Decimal(s.fittingsCount).times(qDec);
      const fr = parseDecimal(s.fittingsRate);
      const frTotal = fc.times(fr);
      components.push({
        code: "STAND_FITTINGS",
        name: "Дистанционные держатели",
        unit: "шт",
        quantity: fc.toString(),
        unitPrice: fr.toString(),
        totalPrice: frTotal.toString(),
        scope: "item",
      });
    }
  }

  // Г. Буквы (C06)
  if (params.letters) {
    const l = params.letters;
    const count = l.count !== undefined ? l.count : (l.text ? l.text.replace(/\s+/g, "").length : 1);
    const countDec = new Decimal(count).times(qDec);
    const heightCm = parseDecimal(l.heightCm || 0);
    const ratePerCm = parseDecimal(l.ratePerCm || 0);
    const complexity = parseDecimal(l.complexityFactor || 1);

    if (ratePerCm.isZero()) {
      status = "blocked";
      missingFields.push("letters.ratePerCm (не задан тариф)");
    }

    // letters_price = height_cm * rate_per_cm * count * complexity (C06)
    const lettersTotal = heightCm.times(ratePerCm).times(countDec).times(complexity);

    components.push({
      code: "LETTERS_BASE",
      name: `Изготовление букв (${countDec.toString()} шт, h=${heightCm.toString()} см)`,
      unit: "букв",
      quantity: countDec.toString(),
      unitPrice: heightCm.times(ratePerCm).times(complexity).toString(),
      totalPrice: lettersTotal.toString(),
      scope: "item",
    });
  }

  // Д. Монтаж и выезды (C02, C03, C05)
  if (params.installation && params.installation.enabled) {
    const inst = params.installation;
    const baseRate = parseDecimal(inst.rate || 0);
    const heightFactor = parseDecimal(inst.heightFactor || 1);
    const equipCost = parseDecimal(inst.equipmentCost || 0);
    const transCost = parseDecimal(inst.transportCost || 0);

    let instWork = baseRate.times(heightFactor);
    // Область действия: на изделие (per_item) или на объект/выезд (site_visit)
    if (inst.scope === "per_item") {
      instWork = instWork.times(qDec);
    }

    const totalInstall = instWork.plus(equipCost).plus(transCost);

    components.push({
      code: "INSTALLATION",
      name: inst.scope === "site_visit" ? "Выездной монтаж на объекте (единый)" : "Монтажные работы",
      unit: inst.scope === "site_visit" ? "выезд" : "шт",
      quantity: inst.scope === "site_visit" ? "1" : qDec.toString(),
      unitPrice: totalInstall.toString(),
      totalPrice: totalInstall.toString(),
      scope: inst.scope === "site_visit" ? "site_visit" : "item",
    });
  }

  // 6. Суммирование компонентов (Subtotal)
  let subtotal = new Decimal(0);
  for (const c of components) {
    subtotal = subtotal.plus(parseDecimal(c.totalPrice));
  }

  // 7. Скидки (C11)
  let discountAmount = new Decimal(0);
  if (params.discount && params.discount.value) {
    const dVal = parseDecimal(params.discount.value);
    if (params.discount.type === "percent") {
      // dVal / 100
      discountAmount = subtotal.times(dVal.dividedBy(100));
    } else {
      discountAmount = Decimal.min(dVal, subtotal);
    }
  }

  const afterDiscount = subtotal.minus(discountAmount);

  // 8. Минимум заказа с доплатой (C11)
  let surchargeAmount = new Decimal(0);
  if (params.minimumOrder && params.minimumOrder.enabled) {
    const minOrder = parseDecimal(params.minimumOrder.amount);
    if (afterDiscount.lessThan(minOrder)) {
      if (params.minimumOrder.action === "surcharge") {
        // max(0, minimum_order - сумма после скидок)
        surchargeAmount = minOrder.minus(afterDiscount);
      } else if (params.minimumOrder.action === "block") {
        status = "blocked";
        warnings.push(`Сумма заказа меньше минимальной (${minOrder.toString()} UZS)`);
      } else {
        warnings.push(`Внимание: сумма заказа ниже рекомендуемого минимума ${minOrder.toString()} UZS`);
      }
    }
  }

  const taxableBase = afterDiscount.plus(surchargeAmount);

  // 9. Налог
  let taxAmount = new Decimal(0);
  let totalWithTax = taxableBase;
  if (params.tax && params.tax.enabled) {
    const taxRate = parseDecimal(params.tax.rate);
    if (params.tax.mode === "add_on_top") {
      taxAmount = taxableBase.times(taxRate);
      totalWithTax = taxableBase.plus(taxAmount);
    } else {
      // Включенный налог
      taxAmount = taxableBase.minus(taxableBase.dividedBy(new Decimal(1).plus(taxRate)));
    }
  }

  // 10. Финальное округление
  const finalRoundingStep = params.roundingStep || 1;
  const customerTotal = roundToStep(totalWithTax, finalRoundingStep, "up");

  return buildResult(
    status, wM, hM, q, areaOne, areaTotal, billableArea, perimeterOne, perimeterTotal,
    components, subtotal, discountAmount, surchargeAmount, taxAmount, customerTotal,
    warnings, missingFields, userPermissions
  );
}

function buildResult(
  status: CalculationStatus,
  wM: Decimal,
  hM: Decimal,
  q: number,
  areaOne: Decimal,
  areaTotal: Decimal,
  billableArea: Decimal,
  perimeterOne: Decimal,
  perimeterTotal: Decimal,
  components: CalculationComponent[],
  subtotal: Decimal,
  discountAmount: Decimal,
  surchargeAmount: Decimal,
  taxAmount: Decimal,
  customerTotal: Decimal,
  warnings: string[],
  missingFields: string[],
  userPermissions: { canViewCost?: boolean },
  plannedCost?: Decimal,
  grossProfit?: Decimal,
  marginRate?: Decimal
): CalculationResult {
  const tokenPayload = `${customerTotal.toString()}-${Date.now()}-${Math.random()}`;
  const calculationToken = crypto.createHash("sha256").update(tokenPayload).digest("hex").substring(0, 24);

  const res: CalculationResult = {
    status,
    normalizedInputs: {
      widthM: wM.toString(),
      heightM: hM.toString(),
      quantity: q,
      areaOneM2: areaOne.toString(),
      areaTotalM2: areaTotal.toString(),
      billableAreaM2: billableArea.toString(),
      perimeterOneM: perimeterOne.toString(),
      perimeterTotalM: perimeterTotal.toString(),
    },
    components,
    subtotal: subtotal.toString(),
    discountAmount: discountAmount.toString(),
    surchargeAmount: surchargeAmount.toString(),
    taxAmount: taxAmount.toString(),
    customerTotal: customerTotal.toString(),
    warnings,
    missingFields,
    calculationToken,
  };

  if (userPermissions.canViewCost && plannedCost) {
    res.plannedCostTotal = plannedCost.toString();
    res.grossProfit = grossProfit ? grossProfit.toString() : undefined;
    res.marginRate = marginRate ? marginRate.toString() : undefined;
  }

  return res;
}
