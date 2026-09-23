import { NextRequest, NextResponse } from "next/server";
import { calculateAdvertisingItem } from "@/lib/calculator/engine";
import { CalculationParameterInputs, PricingMode } from "@/lib/calculator/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      service_version_id, 
      parameters, 
      selected_options, 
      pricing_mode = "tariff",
      user_role = "MANAGER"
    } = body;

    if (!parameters) {
      return NextResponse.json(
        { error: "Поле parameters обязательно для расчета" },
        { status: 400 }
      );
    }

    // Проверка прав: себестоимость и маржа видны только Владельцу (DIRECTOR/OWNER) или Финансам (FINANCE)
    const canViewCost = user_role === "DIRECTOR" || user_role === "OWNER" || user_role === "FINANCE";

    // Адаптация входных параметров
    const calcParams: CalculationParameterInputs = {
      width: parameters.width,
      height: parameters.height,
      quantity: parameters.quantity !== undefined ? Number(parameters.quantity) : 1,
      bleed: parameters.bleed,
      minArea: parameters.minArea,
      printRate: parameters.printRate,
      edgeProcessing: parameters.edgeProcessing,
      edgeRate: parameters.edgeRate,
      eyelets: parameters.eyelets,
      frame: parameters.frame,
      installation: parameters.installation,
      film: parameters.film,
      stand: parameters.stand,
      letters: parameters.letters,
      lightbox: parameters.lightbox,
      costPlus: parameters.costPlus,
      discount: parameters.discount,
      minimumOrder: parameters.minimumOrder,
      tax: parameters.tax,
      roundingStep: parameters.roundingStep || 1000,
    };

    const result = calculateAdvertisingItem(
      calcParams, 
      pricing_mode as PricingMode, 
      { canViewCost }
    );

    return NextResponse.json({
      service_version_id: service_version_id || "v1.0-master-print",
      status: result.status,
      normalized_inputs: result.normalizedInputs,
      components: result.components,
      subtotal: result.subtotal,
      discount_amount: result.discountAmount,
      surcharge_amount: result.surchargeAmount,
      tax_amount: result.taxAmount,
      customer_total: result.customerTotal,
      planned_cost_total: result.plannedCostTotal,
      gross_profit: result.grossProfit,
      margin_rate: result.marginRate,
      warnings: result.warnings,
      missing_fields: result.missingFields,
      calculation_token: result.calculationToken,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Ошибка при выполнении расчета" },
      { status: 400 }
    );
  }
}
