import type { Invoice } from "@/lib/types/invoice";

/**
 * Returns the next invoice number in YYYY-NNN format.
 * Finds the max sequence number for the given year from existing invoices.
 * Returns YYYY-001 if no invoices exist for that year.
 */
export function getNextInvoiceNumber(invoices: Invoice[], year: number): string {
  const yearPrefix = `${year}-`;
  const yearInvoices = invoices.filter((inv) =>
    inv.number.startsWith(yearPrefix),
  );

  if (yearInvoices.length === 0) {
    return `${year}-001`;
  }

  const maxSeq = yearInvoices.reduce((max, inv) => {
    const seq = parseInt(inv.number.slice(yearPrefix.length), 10);
    return isNaN(seq) ? max : Math.max(max, seq);
  }, 0);

  return `${year}-${String(maxSeq + 1).padStart(3, "0")}`;
}
