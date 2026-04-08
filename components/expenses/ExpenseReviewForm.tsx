"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { CheckCircle, ChevronLeft, AlertCircle, Fuel, Shield, Briefcase, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  appendExpense,
  nextExpenseId,
  readExpenses,
  updateExpense,
  uploadReceiptImage,
  type ExpenseCategory,
  type ExpenseRecord,
} from "@/lib/expenses";
import type { OcrResult } from "@/app/api/scan-receipt/route";

interface ExpenseReviewFormProps {
  ocrResult: OcrResult;
  imageBlob: Blob | null;
  /** Called after successful save — parent navigates away */
  onSaved: () => void;
  onBack: () => void;
  /** In edit mode: existing record values override ocrResult defaults */
  existingRecord?: ExpenseRecord;
}

const CATEGORIES: { id: ExpenseCategory; icon: React.ReactNode; labelKey: string }[] = [
  { id: "combustible", icon: <Fuel className="h-4 w-4" />, labelKey: "combustible" },
  { id: "seguros",     icon: <Shield className="h-4 w-4" />, labelKey: "seguros" },
  { id: "servicios",   icon: <Briefcase className="h-4 w-4" />, labelKey: "servicios" },
  { id: "otros",       icon: <Package className="h-4 w-4" />, labelKey: "otros" },
];

export function ExpenseReviewForm({
  ocrResult,
  imageBlob,
  onSaved,
  onBack,
  existingRecord,
}: ExpenseReviewFormProps) {
  const t = useTranslations("expenses");
  const { data: session } = useSession();

  const [vendor, setVendor] = useState(
    existingRecord?.vendor ?? ocrResult.vendorName ?? "",
  );
  const [vendorNif, setVendorNif] = useState(
    existingRecord?.vendorNif ?? ocrResult.vendorNif ?? "",
  );
  const [date, setDate] = useState(
    existingRecord?.date ?? ocrResult.date ?? new Date().toISOString().slice(0, 10),
  );
  const [total, setTotal] = useState(
    existingRecord?.total?.toString() ?? ocrResult.total?.toString() ?? "",
  );
  const [ivaRate, setIvaRate] = useState(
    existingRecord?.ivaRate?.toString() ?? ocrResult.ivaRate?.toString() ?? "",
  );
  const [ivaAmount, setIvaAmount] = useState(
    existingRecord?.ivaAmount?.toString() ?? ocrResult.ivaAmount?.toString() ?? "",
  );
  const [baseImponible, setBaseImponible] = useState(
    existingRecord?.baseImponible?.toString() ?? ocrResult.baseImponible?.toString() ?? "",
  );
  const [notes, setNotes] = useState(existingRecord?.notes ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(
    existingRecord?.category ?? "otros",
  );

  const [saving, setSaving] = useState(false);
  const [imagePreviewUrl] = useState(
    imageBlob ? URL.createObjectURL(imageBlob) : null,
  );
  const [imageExpanded, setImageExpanded] = useState(false);

  // Fields from OCR with confidence (non-null in the original ocrResult)
  const confident = new Set<string>(
    Object.entries(ocrResult)
      .filter(([, v]) => v !== null)
      .map(([k]) => k),
  );

  const canSave = vendor.trim().length > 0 && total.trim().length > 0;

  async function handleSave() {
    if (!canSave || !session?.access_token) return;
    setSaving(true);
    try {
      const token = session.access_token;

      // In edit mode, update the record directly
      if (existingRecord) {
        await updateExpense(
          {
            ...existingRecord,
            vendor: vendor.trim(),
            vendorNif: vendorNif.trim() || null,
            date,
            total: parseFloat(total),
            ivaRate: ivaRate ? parseFloat(ivaRate) : null,
            ivaAmount: ivaAmount ? parseFloat(ivaAmount) : null,
            baseImponible: baseImponible ? parseFloat(baseImponible) : null,
            documentType: ocrResult.documentType ?? existingRecord.documentType,
            category,
            notes: notes.trim() || null,
          },
          token,
        );
        toast.success(t("savedSuccess"));
        onSaved();
        return;
      }

      // New record — derive ID, upload image, append
      const existing = await readExpenses(token);
      const id = await nextExpenseId(existing);

      let imagePath: string | null = null;
      if (imageBlob) {
        imagePath = await uploadReceiptImage(
          imageBlob,
          id,
          vendor.trim(),
          date,
          token,
        );
      }

      const record: ExpenseRecord = {
        id,
        date,
        vendor: vendor.trim(),
        vendorNif: vendorNif.trim() || null,
        total: parseFloat(total),
        ivaRate: ivaRate ? parseFloat(ivaRate) : null,
        ivaAmount: ivaAmount ? parseFloat(ivaAmount) : null,
        baseImponible: baseImponible ? parseFloat(baseImponible) : null,
        documentType: ocrResult.documentType ?? null,
        category,
        imagePath,
        notes: notes.trim() || null,
        createdAt: new Date().toISOString(),
      };

      await appendExpense(record, token);
      toast.success(t("savedSuccess"));
      onSaved();
    } catch (err) {
      console.error("[ExpenseReviewForm] save error:", err);
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-6 pb-4">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">
          {existingRecord ? t("editExpenseTitle") : t("reviewTitle")}
        </h1>
      </div>

      <div className="px-4 pb-6 space-y-4">
        {/* Receipt thumbnail */}
        {imagePreviewUrl && (
          <div className="w-full">
            <button
              onClick={() => setImageExpanded((v) => !v)}
              className="w-full rounded-card overflow-hidden border border-border"
            >
              <img
                src={imagePreviewUrl}
                alt={t("receiptThumbnail")}
                className={`w-full object-cover transition-all ${
                  imageExpanded ? "max-h-[60vh]" : "max-h-32"
                }`}
              />
            </button>
            <p className="text-xs text-muted-foreground text-center mt-1">
              {t("tapToExpand")}
            </p>
          </div>
        )}

        {/* ticket_simplificado note */}
        {ocrResult.documentType === "ticket_simplificado" && (
          <div className="flex items-start gap-2 rounded-card bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-3">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {t("ticketSimplificadoNote")}
            </p>
          </div>
        )}

        {/* Fields */}
        <FieldInput
          label={t("form.vendor")}
          value={vendor}
          onChange={setVendor}
          required
          confident={confident.has("vendorName")}
        />

        <FieldInput
          label={t("form.vendorNif")}
          value={vendorNif}
          onChange={setVendorNif}
          confident={confident.has("vendorNif")}
        />

        <FieldInput
          label={t("form.date")}
          value={date}
          onChange={setDate}
          type="date"
          required
          confident={confident.has("date")}
        />

        <FieldInput
          label={t("form.total")}
          value={total}
          onChange={setTotal}
          type="number"
          required
          confident={confident.has("total")}
        />

        <FieldInput
          label={t("form.ivaRate")}
          value={ivaRate}
          onChange={setIvaRate}
          type="number"
          confident={confident.has("ivaRate")}
        />

        <FieldInput
          label={t("form.ivaAmount")}
          value={ivaAmount}
          onChange={setIvaAmount}
          type="number"
          confident={confident.has("ivaAmount")}
        />

        <FieldInput
          label={t("form.baseImponible")}
          value={baseImponible}
          onChange={setBaseImponible}
          type="number"
          confident={confident.has("baseImponible")}
        />

        <FieldInput
          label={t("form.notes")}
          value={notes}
          onChange={setNotes}
        />

        {/* Category chips */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t("form.category")}</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  category === cat.id
                    ? "bg-primary text-white"
                    : "bg-border text-muted-foreground hover:bg-border/70"
                }`}
              >
                {cat.icon}
                {t(`categories.${cat.labelKey}`)}
              </button>
            ))}
          </div>

          {/* Vehicle deductibility warning */}
          {category === "combustible" && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t("vehicleDeductibilityWarning")}
            </p>
          )}
        </div>

        {/* Save CTA */}
        <Button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full bg-primary text-white hover:bg-primary/90"
          size="lg"
        >
          {saving ? t("saving") : t("saveExpense")}
        </Button>
      </div>
    </div>
  );
}

// ─── Helper ────────────────────────────────────────────────────────────────

interface FieldInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  confident?: boolean;
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  confident = false,
}: FieldInputProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {required && <span className="text-xs text-destructive">*</span>}
        {confident && (
          <CheckCircle className="h-3.5 w-3.5 text-green-500" aria-label="OCR confidence" />
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}
