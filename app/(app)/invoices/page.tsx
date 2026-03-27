"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { InvoiceRow } from "@/components/invoice/InvoiceRow";
import { getInvoices } from "@/lib/actions/get-invoices";
import { getCurrentQuarter, getQuarterBounds } from "@/lib/quarter";
import type { Invoice, InvoiceState } from "@/lib/types/invoice";

type StateFilter = "all" | InvoiceState;
type QuarterFilter = "all" | "q1" | "q2" | "q3" | "q4";

const STATES: StateFilter[] = ["all", "draft", "issued", "paid", "rectified"];
const QUARTERS: QuarterFilter[] = ["all", "q1", "q2", "q3", "q4"];

export default function InvoicesPage() {
  const t = useTranslations("invoices");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [quarterFilter, setQuarterFilter] = useState<QuarterFilter>("all");

  useEffect(() => {
    getInvoices().then((data) => {
      // Most recent first
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.issuedAt ?? b.createdAt).getTime() -
          new Date(a.issuedAt ?? a.createdAt).getTime(),
      );
      setInvoices(sorted);
      setLoading(false);
    });
  }, []);

  const { year } = getCurrentQuarter();

  const filtered = invoices.filter((inv) => {
    if (stateFilter !== "all" && inv.state !== stateFilter) return false;

    if (quarterFilter !== "all") {
      const qNum = parseInt(quarterFilter[1]) as 1 | 2 | 3 | 4;
      const { start, end } = getQuarterBounds(year, qNum);
      const d = new Date(inv.issuedAt ?? inv.createdAt);
      if (d < start || d > end) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        inv.client.name.toLowerCase().includes(q) ||
        inv.number.toLowerCase().includes(q)
      );
    }

    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
          <Button
            onClick={() => router.push("/invoices/new")}
            size="sm"
            className="bg-primary text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("newInvoice")}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="w-full rounded-card border border-border bg-surface pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {STATES.map((s) => (
            <button
              key={s}
              onClick={() => setStateFilter(s)}
              className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                stateFilter === s
                  ? "bg-primary text-white"
                  : "bg-border text-muted-foreground hover:bg-border/70"
              }`}
            >
              {s === "all" ? t("allStates") : t(`states.${s}`)}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {QUARTERS.map((q) => (
            <button
              key={q}
              onClick={() => setQuarterFilter(q)}
              className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                quarterFilter === q
                  ? "bg-primary text-white"
                  : "bg-border text-muted-foreground hover:bg-border/70"
              }`}
            >
              {q === "all" ? t("allQuarters") : t(`quarters.${q}`)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-px px-4 pt-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-card" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
            <p className="text-lg font-semibold text-foreground">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptySubtitle")}</p>
            <Button
              onClick={() => router.push("/invoices/new")}
              className="bg-primary text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("newInvoice")}
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border border-t border-border">
            {filtered.map((inv) => (
              <InvoiceRow key={inv.id} invoice={inv} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
