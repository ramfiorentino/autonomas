"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getInvoices } from "@/lib/actions/get-invoices";
import { saveInvoice } from "@/lib/actions/save-invoice";
import { applyTransition } from "@/lib/invoice-machine";
import type { Invoice, InvoiceState } from "@/lib/types/invoice";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function StateBadge({ state }: { state: InvoiceState }) {
  const t = useTranslations("invoices.states");
  const classes: Record<InvoiceState, string> = {
    draft: "bg-border text-muted-foreground",
    issued: "bg-primary/10 text-primary",
    paid: "bg-green-100 text-green-700",
    rectified: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${classes[state]}`}>
      {t(state)}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right max-w-[55%]">{value}</span>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("invoices");
  const locale = useLocale();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInvoices().then((invoices) => {
      const found = invoices.find((inv) => inv.id === id) ?? null;
      setInvoice(found);
      setLoading(false);
    });
  }, [id]);

  function fmtDate(iso?: string): string {
    if (!iso) return "—";
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  }

  async function handleMarkPaid() {
    if (!invoice) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = applyTransition(invoice, "paid", {
        paidAt: new Date().toISOString(),
      });
      const result = await saveInvoice(updated);
      if (!result.success) throw new Error(result.error);
      setInvoice(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setActionLoading(false);
    }
  }

  function handleIssueRectificativa() {
    if (!invoice) return;
    const params = new URLSearchParams({ rectificaId: invoice.id });
    router.push(`/invoices/new?${params.toString()}`);
  }

  function handleIssueInvoice() {
    if (!invoice) return;
    router.push(`/invoices/new?draftId=${invoice.id}`);
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-12 w-full rounded-card" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-muted-foreground">Factura no encontrada</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/invoices")}
        >
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-32 space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/invoices")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("title")}
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground">{invoice.number}</p>
          <p className="text-xl font-bold text-foreground mt-1">
            {formatCurrency(invoice.total)}
          </p>
        </div>
        <StateBadge state={invoice.state} />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Parties */}
      <div className="rounded-card border border-border bg-surface p-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t("form.issuerSection")}
        </p>
        <p className="text-sm font-medium">{invoice.issuerName}</p>
        {invoice.issuerNif && <p className="text-xs text-muted-foreground">{invoice.issuerNif}</p>}
        {invoice.issuerAddress && <p className="text-xs text-muted-foreground">{invoice.issuerAddress}</p>}
      </div>

      <div className="rounded-card border border-border bg-surface p-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t("form.clientSection")}
        </p>
        <p className="text-sm font-medium">{invoice.client.name}</p>
        {invoice.client.nif && <p className="text-xs text-muted-foreground">{invoice.client.nif}</p>}
        {invoice.client.address && <p className="text-xs text-muted-foreground">{invoice.client.address}</p>}
        {invoice.simplificada && (
          <p className="text-xs text-muted-foreground">{t("form.simplificada")}</p>
        )}
      </div>

      {/* Service & Totals */}
      <div className="rounded-card border border-border bg-surface p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t("form.serviceSection")}
        </p>
        <DetailRow label={t("form.description")} value={invoice.line.description} />
        <DetailRow label={t("form.baseAmount")} value={formatCurrency(invoice.line.amount)} />
        <DetailRow
          label={
            invoice.ivaType === "exempt"
              ? t("form.ivaExempt")
              : t("form.ivaRate")
          }
          value={
            invoice.ivaType === "exempt"
              ? "—"
              : formatCurrency(invoice.ivaAmount)
          }
        />
        {invoice.irpfAmount > 0 && (
          <DetailRow
            label={t("form.irpfLabel", { rate: invoice.irpfRate })}
            value={`−${formatCurrency(invoice.irpfAmount)}`}
          />
        )}
        <div className="flex justify-between pt-2 mt-1 border-t border-border">
          <span className="text-sm font-bold">{t("form.total")}</span>
          <span className="text-sm font-bold text-primary">
            {formatCurrency(invoice.total)}
          </span>
        </div>
      </div>

      {/* Dates */}
      <div className="rounded-card border border-border bg-surface p-4 space-y-0">
        <DetailRow label={t("detail.issuedAt")} value={fmtDate(invoice.issuedAt ?? invoice.issueDate)} />
        {invoice.paidAt && (
          <DetailRow label={t("detail.paidAt")} value={fmtDate(invoice.paidAt)} />
        )}
        {invoice.rectificaRef && (
          <DetailRow
            label={t("form.rectificaBanner", { number: "" }).trim()}
            value={invoice.rectificaRef}
          />
        )}
      </div>

      {/* Actions */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 p-4 bg-background border-t border-border space-y-2 z-40">
        {/* PDF button for issued/paid */}
        {(invoice.state === "issued" || invoice.state === "paid") &&
          invoice.pdfPath && (
            <a
              href={invoice.pdfPath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-card border border-border bg-surface py-3 text-sm font-medium text-foreground hover:bg-primary-light transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              {t("detail.viewPdf")}
            </a>
          )}

        {/* Draft: issue */}
        {invoice.state === "draft" && (
          <Button
            onClick={handleIssueInvoice}
            className="w-full bg-primary text-white hover:bg-primary/90"
            size="lg"
          >
            {t("detail.issueInvoice")}
          </Button>
        )}

        {/* Issued: mark paid + rectificativa */}
        {invoice.state === "issued" && (
          <>
            <Button
              onClick={handleMarkPaid}
              disabled={actionLoading}
              className="w-full bg-primary text-white hover:bg-primary/90"
              size="lg"
            >
              {actionLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  …
                </span>
              ) : (
                t("detail.markPaid")
              )}
            </Button>
            <Button
              onClick={handleIssueRectificativa}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {t("detail.issueRectificativa")}
            </Button>
          </>
        )}

        {/* Paid: rectificativa only */}
        {invoice.state === "paid" && (
          <Button
            onClick={handleIssueRectificativa}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {t("detail.issueRectificativa")}
          </Button>
        )}
      </div>
    </div>
  );
}
