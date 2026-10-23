// Revenue reporting rules (spec §47).
//
//   Valid order        = any order whose orderStatus != CANCELLED
//   Expected cash      = sum of totalAmount over valid orders (cash method)
//   Collected cash     = sum of totalAmount where paymentStatus = PAID
//   Pending cash       = Expected - Collected
//   Cancelled orders   = excluded from all revenue figures

export interface CashRecon {
  expectedCash: number;
  collectedCash: number;
  pendingCash: number;
  paidOrders: number;
  validOrders: number;
  cancelledOrders: number;
}

export function reconcileCash(rows: { totalAmount: number; orderStatus: string; paymentStatus: string }[]): CashRecon {
  let expectedCash = 0;
  let collectedCash = 0;
  let paidOrders = 0;
  let validOrders = 0;
  let cancelledOrders = 0;
  for (const r of rows) {
    if (r.orderStatus === 'CANCELLED') {
      cancelledOrders += 1;
      continue;
    }
    validOrders += 1;
    expectedCash += r.totalAmount;
    if (r.paymentStatus === 'PAID') {
      collectedCash += r.totalAmount;
      paidOrders += 1;
    }
  }
  return {
    expectedCash,
    collectedCash,
    pendingCash: expectedCash - collectedCash,
    paidOrders,
    validOrders,
    cancelledOrders,
  };
}
