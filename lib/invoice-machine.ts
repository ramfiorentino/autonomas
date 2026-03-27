import type { Invoice, InvoiceState } from "@/lib/types/invoice";

export const VALID_TRANSITIONS: Record<InvoiceState, InvoiceState[]> = {
  draft: ["issued"],
  issued: ["paid", "rectified"],
  paid: ["rectified"],
  rectified: [],
};

export function canTransition(invoice: Invoice, targetState: InvoiceState): boolean {
  return VALID_TRANSITIONS[invoice.state].includes(targetState);
}

export interface TransitionMetadata {
  issuedAt?: string;
  paidAt?: string;
  pdfPath?: string;
}

export function applyTransition(
  invoice: Invoice,
  targetState: InvoiceState,
  metadata?: TransitionMetadata,
): Invoice {
  if (!canTransition(invoice, targetState)) {
    throw new Error(
      `Invalid transition: ${invoice.state} → ${targetState}`,
    );
  }

  return {
    ...invoice,
    state: targetState,
    ...(metadata?.issuedAt && { issuedAt: metadata.issuedAt }),
    ...(metadata?.paidAt && { paidAt: metadata.paidAt }),
    ...(metadata?.pdfPath && { pdfPath: metadata.pdfPath }),
  };
}
