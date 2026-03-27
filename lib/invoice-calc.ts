import type { ClientType, IvaType } from "@/lib/types/invoice";

export interface InvoiceCalculation {
  base: number;
  ivaType: IvaType;
  ivaRate: number;
  ivaAmount: number;
  irpfRate: number;
  irpfAmount: number;
  total: number;
}

/**
 * Calculates IVA and IRPF for an invoice.
 *
 * IVA rules (from activityType in settings):
 *   medical → exempt (0%)
 *   other   → standard (21%)
 *
 * IRPF rules (from irpfRate in settings and client type):
 *   individual → 0% (no retention)
 *   business   → irpfRate (7% or 15%)
 */
export function calculateInvoice(
  baseAmount: number,
  activityType: "medical" | "other",
  clientType: ClientType,
  irpfRate: 7 | 15,
): InvoiceCalculation {
  const base = baseAmount;

  // IVA
  const ivaType: IvaType = activityType === "medical" ? "exempt" : "standard";
  const ivaRate = ivaType === "standard" ? 21 : 0;
  const ivaAmount = ivaType === "standard" ? Math.round(base * 0.21 * 100) / 100 : 0;

  // IRPF
  const appliedIrpfRate = clientType === "business" ? irpfRate : 0;
  const irpfAmount = clientType === "business" ? Math.round(base * (irpfRate / 100) * 100) / 100 : 0;

  // Total: base + IVA - IRPF
  const total = Math.round((base + ivaAmount - irpfAmount) * 100) / 100;

  return {
    base,
    ivaType,
    ivaRate,
    ivaAmount,
    irpfRate: appliedIrpfRate,
    irpfAmount,
    total,
  };
}
