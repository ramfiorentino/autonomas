"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Plus, Search, Camera, PenLine, Fuel, Shield, Briefcase, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { UpgradeSheet } from "@/components/UpgradeSheet";
import { readExpenses, type ExpenseRecord, type ExpenseCategory } from "@/lib/expenses";
import { getCurrentQuarter, getQuarterBounds } from "@/lib/quarter";

type CategoryFilter = "all" | ExpenseCategory;
type QuarterFilter = "all" | "q1" | "q2" | "q3" | "q4";

const CATEGORIES: CategoryFilter[] = ["all", "combustible", "seguros", "servicios", "otros"];
const QUARTERS: QuarterFilter[] = ["all", "q1", "q2", "q3", "q4"];

const CATEGORY_ICONS: Record<ExpenseCategory, React.ReactNode> = {
  combustible: <Fuel className="h-4 w-4 text-amber-500" />,
  seguros: <Shield className="h-4 w-4 text-blue-500" />,
  servicios: <Briefcase className="h-4 w-4 text-purple-500" />,
  otros: <Package className="h-4 w-4 text-muted-foreground" />,
};

export default function GastosPage() {
  const t = useTranslations("expenses");
  const router = useRouter();
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [quarterFilter, setQuarterFilter] = useState<QuarterFilter>("all");
  const [fabOpen, setFabOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const isPaid = session?.tier === "paid" &&
    (session?.status === "active" || session?.status === "past_due");

  const loadExpenses = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const data = await readExpenses(session.access_token);
      const sorted = [...data].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setExpenses(sorted);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const { year } = getCurrentQuarter();

  const filtered = expenses.filter((exp) => {
    if (categoryFilter !== "all" && exp.category !== categoryFilter) return false;

    if (quarterFilter !== "all") {
      const qNum = parseInt(quarterFilter[1]) as 1 | 2 | 3 | 4;
      const { start, end } = getQuarterBounds(year, qNum);
      const d = new Date(exp.date + "T00:00:00");
      if (d < start || d > end) return false;
    }

    if (search.trim()) {
      return exp.vendor.toLowerCase().includes(search.toLowerCase());
    }

    return true;
  });

  function formatDate(iso: string) {
    const [year, month, day] = iso.split("-");
    return `${day}/${month}/${year}`;
  }

  function formatEuro(amount: number) {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
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

        {/* Category filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? "bg-primary text-white"
                  : "bg-border text-muted-foreground hover:bg-border/70"
              }`}
            >
              {cat === "all" ? t("allCategories") : t(`categories.${cat}`)}
            </button>
          ))}
        </div>

        {/* Quarter filter */}
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
              <Skeleton key={i} className="h-16 w-full rounded-card" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
            <p className="text-lg font-semibold text-foreground">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptySubtitle")}</p>
            <Button
              onClick={() => {
                if (isPaid) router.push("/expenses/new?scan=true");
                else setUpgradeOpen(true);
              }}
              className="bg-primary text-white hover:bg-primary/90"
            >
              <Camera className="h-4 w-4 mr-2" />
              {t("scanReceipt")}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/expenses/new")}
            >
              <PenLine className="h-4 w-4 mr-2" />
              {t("newExpense")}
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border border-t border-border">
            {filtered.map((exp) => (
              <button
                key={exp.id}
                onClick={() => router.push(`/expenses/${exp.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  {CATEGORY_ICONS[exp.category]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{exp.vendor}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(exp.date)}</p>
                </div>
                <span className="text-sm font-semibold text-foreground flex-shrink-0">
                  {formatEuro(exp.total)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-20 right-4 md:bottom-6 flex flex-col items-end gap-2 z-10">
        {fabOpen && (
          <>
            {isPaid && (
              <button
                onClick={() => { setFabOpen(false); router.push("/expenses/new?scan=true"); }}
                className="flex items-center gap-2 bg-surface border border-border rounded-full px-4 py-2 text-sm font-medium text-foreground shadow-md hover:bg-muted/30 transition-colors"
              >
                <Camera className="h-4 w-4 text-primary" />
                {t("scanReceipt")}
              </button>
            )}
            {!isPaid && (
              <button
                onClick={() => { setFabOpen(false); setUpgradeOpen(true); }}
                className="flex items-center gap-2 bg-surface border border-border rounded-full px-4 py-2 text-sm font-medium text-foreground shadow-md hover:bg-muted/30 transition-colors"
              >
                <Camera className="h-4 w-4 text-primary" />
                {t("scanReceipt")}
              </button>
            )}
            <button
              onClick={() => { setFabOpen(false); router.push("/expenses/new"); }}
              className="flex items-center gap-2 bg-surface border border-border rounded-full px-4 py-2 text-sm font-medium text-foreground shadow-md hover:bg-muted/30 transition-colors"
            >
              <PenLine className="h-4 w-4 text-primary" />
              {isPaid ? t("manualEntry") : t("newExpense")}
            </button>
          </>
        )}
        <button
          onClick={() => setFabOpen((o) => !o)}
          className="w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          aria-label={t("addExpense")}
        >
          <Plus className={`h-6 w-6 transition-transform ${fabOpen ? "rotate-45" : ""}`} />
        </button>
      </div>

      {/* Click outside to close FAB */}
      {fabOpen && (
        <div
          className="fixed inset-0 z-[9]"
          onClick={() => setFabOpen(false)}
        />
      )}

      {upgradeOpen && (
        <UpgradeSheet
          onClose={() => setUpgradeOpen(false)}
          featureName={t("scanReceipt")}
        />
      )}
    </div>
  );
}
