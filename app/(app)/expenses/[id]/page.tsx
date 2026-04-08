"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ExpenseReviewForm } from "@/components/expenses/ExpenseReviewForm";
import { readExpenses, deleteExpense, type ExpenseRecord } from "@/lib/expenses";
import type { OcrResult } from "@/app/api/scan-receipt/route";

function expenseToOcrResult(expense: ExpenseRecord): OcrResult {
  return {
    vendorName: expense.vendor,
    vendorNif: expense.vendorNif,
    date: expense.date,
    total: expense.total,
    ivaRate: expense.ivaRate,
    ivaAmount: expense.ivaAmount,
    baseImponible: expense.baseImponible,
    documentType: expense.documentType,
  };
}

export default function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("expenses");
  const router = useRouter();
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [expense, setExpense] = useState<ExpenseRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;
    readExpenses(session.access_token).then((records) => {
      const found = records.find((r) => r.id === parseInt(id, 10));
      setExpense(found ?? null);
      setLoading(false);
    });
  }, [id, session?.access_token]);

  async function handleDelete() {
    if (!session?.access_token || !expense) return;
    setDeleting(true);
    try {
      await deleteExpense(expense.id, session.access_token);
      toast.success(t("deletedSuccess"));
      router.push("/expenses");
    } catch {
      toast.error(t("deleteFailed"));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <p className="text-foreground font-medium">{t("notFound")}</p>
        <Button variant="outline" onClick={() => router.push("/expenses")}>
          {t("backToList")}
        </Button>
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <Trash2 className="h-8 w-8 text-destructive" />
        <p className="text-foreground font-medium">{t("deleteConfirmTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("deleteConfirmMessage")}</p>
        <div className="flex gap-3 w-full max-w-xs">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setConfirmDelete(false)}
            disabled={deleting}
          >
            {t("cancelDelete")}
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("confirmDelete")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ExpenseReviewForm
        ocrResult={expenseToOcrResult(expense)}
        imageBlob={null}
        onSaved={() => router.push("/expenses")}
        onBack={() => router.push("/expenses")}
        existingRecord={expense}
      />

      {/* Delete option at bottom */}
      <div className="px-4 pb-6 border-t border-border">
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-destructive hover:text-destructive/80 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          {t("deleteExpense")}
        </button>
      </div>
    </div>
  );
}
