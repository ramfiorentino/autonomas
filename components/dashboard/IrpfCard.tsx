"use client";

import { useTranslations } from "next-intl";
import { getCurrentQuarter } from "@/lib/quarter";
import type { Invoice } from "@/lib/types/invoice";

interface IrpfCardProps {
  invoices: Invoice[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function IrpfCard({ invoices }: IrpfCardProps) {
  const t = useTranslations("dashboard");
  const { year, quarter } = getCurrentQuarter();

  const now = new Date();
  const yearStart = new Date(year, 0, 1);

  // Sum issued invoices from Jan 1 to today (YTD)
  const ytdTotal = invoices
    .filter((inv) => {
      if (inv.state !== "issued" && inv.state !== "paid") return false;
      const d = new Date(inv.issuedAt ?? inv.issueDate);
      return d >= yearStart && d <= now;
    })
    .reduce((sum, inv) => sum + (inv.line?.amount ?? 0), 0);

  const irpfEstimate = ytdTotal * 0.2;

  return (
    <div className="rounded-card border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("irpfCard.label")}
        </p>
        <span className="text-xs text-muted-foreground">
          {t("irpfCard.quarter", { quarter, year })}
        </span>
      </div>
      <p className="text-3xl font-bold text-foreground">
        {formatCurrency(irpfEstimate)}
      </p>
      <p className="text-xs text-muted-foreground">{t("irpfCard.disclaimer")}</p>
    </div>
  );
}
