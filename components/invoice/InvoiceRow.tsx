"use client";

import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ChevronRight } from "lucide-react";
import type { Invoice, InvoiceState } from "@/lib/types/invoice";

function StateBadge({ state }: { state: InvoiceState }) {
  const t = useTranslations("invoices.states");
  const classes: Record<InvoiceState, string> = {
    draft: "bg-border text-muted-foreground",
    issued: "bg-primary/10 text-primary",
    paid: "bg-green-100 text-green-700",
    rectified: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes[state]}`}
    >
      {t(state)}
    </span>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const locale = useLocale();

  const displayDate = invoice.issuedAt ?? invoice.createdAt;
  const formattedDate = displayDate
    ? new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(displayDate))
    : "—";

  return (
    <button
      onClick={() => router.push(`/invoices/${invoice.id}`)}
      className="w-full flex items-center justify-between p-4 text-left hover:bg-primary-light transition-colors"
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">
            {invoice.number}
          </span>
          <StateBadge state={invoice.state} />
        </div>
        <p className="text-sm font-medium text-foreground truncate">
          {invoice.client.name}
        </p>
        <p className="text-xs text-muted-foreground">{formattedDate}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <span className="text-sm font-semibold text-foreground">
          {formatCurrency(invoice.total)}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}
