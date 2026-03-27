"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getCurrentQuarter, getQuarterBounds } from "@/lib/quarter";
import type { Invoice } from "@/lib/types/invoice";
import type { Expense } from "@/lib/actions/get-dashboard-data";

interface QuarterSummaryProps {
  invoices: Invoice[];
  expenses: Expense[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface SummaryCardProps {
  label: string;
  amount: number;
  onClick: () => void;
}

function SummaryCard({ label, amount, onClick }: SummaryCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-card border border-border bg-surface p-4 text-left hover:border-primary/40 transition-colors"
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-foreground">{formatCurrency(amount)}</p>
    </button>
  );
}

export function QuarterSummary({ invoices, expenses }: QuarterSummaryProps) {
  const t = useTranslations("dashboard.quarterSummary");
  const router = useRouter();
  const { year, quarter } = getCurrentQuarter();
  const { start, end } = getQuarterBounds(year, quarter);

  const incomeTotal = invoices
    .filter((inv) => {
      if (inv.state !== "issued" && inv.state !== "paid") return false;
      const d = new Date(inv.issuedAt ?? inv.issueDate);
      return d >= start && d <= end;
    })
    .reduce((sum, inv) => sum + (inv.line?.amount ?? 0), 0);

  const expensesTotal = expenses
    .filter((exp) => {
      const d = new Date(exp.date);
      return d >= start && d <= end;
    })
    .reduce((sum, exp) => sum + (exp.amount ?? 0), 0);

  return (
    <div className="flex gap-3">
      <SummaryCard
        label={t("income")}
        amount={incomeTotal}
        onClick={() => router.push("/invoices?quarter=current")}
      />
      <SummaryCard
        label={t("expenses")}
        amount={expensesTotal}
        onClick={() => router.push("/gastos?quarter=current")}
      />
    </div>
  );
}
