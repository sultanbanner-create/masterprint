import { Decimal, parseDecimal } from "../calculator/decimal";

export interface OrderFinanceState {
  orderTotal: string;
  netPaid: string;
  debt: string;
  overpayment: string;
  status: "unpaid" | "partially_paid" | "paid" | "overpaid";
}

export function calculateOrderBalance(
  agreedOrderTotal: string | number,
  receipts: Array<{ amount: string | number }>,
  refunds: Array<{ amount: string | number }> = []
): OrderFinanceState {
  const total = parseDecimal(agreedOrderTotal);

  let allocatedReceipts = new Decimal(0);
  for (const r of receipts) {
    allocatedReceipts = allocatedReceipts.plus(parseDecimal(r.amount));
  }

  let allocatedRefunds = new Decimal(0);
  for (const rf of refunds) {
    allocatedRefunds = allocatedRefunds.plus(parseDecimal(rf.amount));
  }

  // net_paid = allocated_receipts - allocated_refunds (Раздел 8 ТЗ)
  const netPaid = allocatedReceipts.minus(allocatedRefunds);

  // balance = agreed_order_total - net_paid
  const balance = total.minus(netPaid);

  // debt = max(balance, 0)
  const debt = Decimal.max(balance, 0);

  // overpayment = max(-balance, 0)
  const overpayment = Decimal.max(balance.negated(), 0);

  let status: OrderFinanceState["status"] = "unpaid";
  if (netPaid.isZero()) {
    status = "unpaid";
  } else if (netPaid.greaterThan(total)) {
    status = "overpaid";
  } else if (netPaid.equals(total)) {
    status = "paid";
  } else {
    status = "partially_paid";
  }

  return {
    orderTotal: total.toString(),
    netPaid: netPaid.toString(),
    debt: debt.toString(),
    overpayment: overpayment.toString(),
    status,
  };
}
