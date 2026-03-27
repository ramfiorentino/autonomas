"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateInvoice } from "@/lib/invoice-calc";
import { getNextInvoiceNumber } from "@/lib/invoice-numbering";
import { generateInvoicePdf, blobToBase64 } from "@/lib/pdf";
import { getInvoices } from "@/lib/actions/get-invoices";
import { saveInvoice } from "@/lib/actions/save-invoice";
import { uploadInvoicePdf } from "@/lib/actions/upload-invoice-pdf";
import { checkOnboarding } from "@/lib/actions/check-onboarding";
import type { Invoice, ClientType } from "@/lib/types/invoice";

// NIF heuristic: CIF starts with letter
function detectClientType(nif: string): ClientType {
  if (!nif) return "individual";
  // CIF starts with a letter that is NOT an NIE prefix (X, Y, Z)
  const first = nif.trim()[0]?.toUpperCase() ?? "";
  return /[A-Z]/.test(first) && !["X", "Y", "Z"].includes(first)
    ? "business"
    : "individual";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
      {children}
    </p>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary";

const readonlyClass =
  "w-full rounded-card border border-border bg-background px-3 py-2 text-sm text-muted-foreground";

function NewInvoiceInner() {
  const t = useTranslations("invoices");
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();

  // Query params (pre-fill from appointment or rectificativa)
  const patientName = searchParams.get("patientName") ?? "";
  const appointmentType = searchParams.get("appointmentType") ?? "";
  const dateTime = searchParams.get("dateTime") ?? "";
  const rectificaId = searchParams.get("rectificaId") ?? "";

  // Settings from Drive
  const [activityType, setActivityType] = useState<"medical" | "other">("other");
  const [irpfRate, setIrpfRate] = useState<7 | 15>(15);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Issuer
  const [issuerName, setIssuerName] = useState("");
  const [issuerNif, setIssuerNif] = useState("");
  const [issuerAddress, setIssuerAddress] = useState("");

  // Client
  const [clientName, setClientName] = useState(patientName);
  const [clientNif, setClientNif] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientType, setClientType] = useState<ClientType>("individual");

  // Service
  const [description, setDescription] = useState(appointmentType);
  const [amount, setAmount] = useState("");
  const [issueDate, setIssueDate] = useState(
    dateTime ? dateTime.split("T")[0] : today(),
  );
  const [simplificada, setSimplificada] = useState(false);

  // Rectificativa
  const [originalInvoice, setOriginalInvoice] = useState<Invoice | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");

  // Issue flow
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStep, setErrorStep] = useState<string>("");

  // Load settings and handle rectificaId
  useEffect(() => {
    checkOnboarding().then(({ settings }) => {
      if (settings) {
        setActivityType(settings.activityType);
        setIrpfRate(settings.irpfRate);
      }
      setSettingsLoaded(true);
    });

    if (session?.user?.name) {
      setIssuerName(session.user.name);
    }

    if (rectificaId) {
      getInvoices().then((invoices) => {
        const orig = invoices.find((inv) => inv.id === rectificaId);
        if (orig) {
          setOriginalInvoice(orig);
          setClientName(orig.client.name);
          setClientNif(orig.client.nif);
          setClientAddress(orig.client.address);
          setClientType(orig.client.type);
          setDescription(orig.line.description);
          setAmount(String(orig.line.amount));
          setIssuerName(orig.issuerName);
          setIssuerNif(orig.issuerNif);
          setIssuerAddress(orig.issuerAddress);
        }
      });
    }
  }, [session, rectificaId]);

  // Auto-detect client type from NIF
  useEffect(() => {
    if (clientNif && !rectificaId) {
      setClientType(detectClientType(clientNif));
    }
  }, [clientNif, rectificaId]);

  const baseAmount = parseFloat(amount) || 0;
  const calc = calculateInvoice(baseAmount, activityType, clientType, irpfRate);

  const canSimplificada = calc.total <= 400;

  // Validation
  const isValid =
    issuerName.trim() !== "" &&
    clientName.trim() !== "" &&
    description.trim() !== "" &&
    baseAmount > 0 &&
    issueDate !== "" &&
    (simplificada || (clientNif.trim() !== "" && clientAddress.trim() !== "")) &&
    (!rectificaId || correctionReason.trim() !== "");

  async function handleIssue() {
    if (!isValid) return;
    setLoading(true);
    setError(null);

    try {
      // Get all invoices for number generation
      const allInvoices = await getInvoices();
      const year = new Date(issueDate).getFullYear();
      const number = getNextInvoiceNumber(allInvoices, year);

      const newInvoice: Invoice = {
        id: crypto.randomUUID(),
        number,
        state: "issued",
        issuerName,
        issuerNif,
        issuerAddress,
        client: {
          name: clientName,
          nif: simplificada ? "" : clientNif,
          address: simplificada ? "" : clientAddress,
          type: clientType,
        },
        line: { description, amount: baseAmount },
        issueDate,
        ivaType: calc.ivaType,
        ivaRate: calc.ivaRate,
        ivaAmount: calc.ivaAmount,
        irpfRate: calc.irpfRate,
        irpfAmount: calc.irpfAmount,
        total: calc.total,
        simplificada,
        issuedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        ...(rectificaId && { rectificaRef: rectificaId, correctionReason }),
      };

      // Step 1: Generate PDF
      setErrorStep("pdf");
      const blob = await generateInvoicePdf(newInvoice);
      const base64 = await blobToBase64(blob);

      // Step 2: Upload PDF to Drive
      setErrorStep("upload");
      const { pdfPath } = await uploadInvoicePdf(
        base64,
        number,
        clientName,
        issueDate,
      );
      newInvoice.pdfPath = pdfPath;

      // Step 3: Save to income.json
      setErrorStep("save");
      const relatedUpdates: Invoice[] = [];
      if (originalInvoice) {
        relatedUpdates.push({ ...originalInvoice, state: "rectified" });
      }
      const result = await saveInvoice(newInvoice, relatedUpdates);
      if (!result.success) throw new Error(result.error);

      // Step 4: Navigate to detail
      router.push(`/invoices/${newInvoice.id}`);
    } catch (err) {
      setLoading(false);
      const message = err instanceof Error ? err.message : "Unknown error";
      const stepKey =
        errorStep === "pdf"
          ? "errors.pdfFailed"
          : errorStep === "upload"
            ? "errors.uploadFailed"
            : "errors.saveFailed";
      setError(`${t(stepKey)}: ${message}`);
    }
  }

  if (!settingsLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-6">
      <h1 className="text-xl font-bold text-foreground">
        {rectificaId ? t("form.rectificaBanner", { number: originalInvoice?.number ?? "—" }) : t("form.title")}
      </h1>

      {/* Rectificativa banner */}
      {rectificaId && originalInvoice && (
        <div className="rounded-card border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">
            {t("form.rectificaBanner", { number: originalInvoice.number })}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={handleIssue}
              className="text-xs text-destructive underline"
            >
              {t("errors.retry")}
            </button>
          </div>
        </div>
      )}

      {/* Issuer section */}
      <div className="space-y-3">
        <SectionTitle>{t("form.issuerSection")}</SectionTitle>
        <Field label={t("form.issuerName")}>
          <input
            className={inputClass}
            value={issuerName}
            onChange={(e) => setIssuerName(e.target.value)}
            placeholder={t("form.issuerName")}
          />
        </Field>
        <Field label={t("form.issuerNif")}>
          <input
            className={inputClass}
            value={issuerNif}
            onChange={(e) => setIssuerNif(e.target.value)}
            placeholder="12345678A"
          />
        </Field>
        <Field label={t("form.issuerAddress")}>
          <input
            className={inputClass}
            value={issuerAddress}
            onChange={(e) => setIssuerAddress(e.target.value)}
            placeholder={t("form.issuerAddress")}
          />
        </Field>
      </div>

      {/* Client section */}
      <div className="space-y-3">
        <SectionTitle>{t("form.clientSection")}</SectionTitle>
        <Field label={t("form.clientName")}>
          <input
            className={inputClass}
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder={t("form.clientName")}
          />
        </Field>

        {!simplificada && (
          <>
            <Field label={t("form.clientNif")}>
              <input
                className={inputClass}
                value={clientNif}
                onChange={(e) => setClientNif(e.target.value)}
                placeholder="12345678A / A12345678"
              />
            </Field>
            <Field label={t("form.clientAddress")}>
              <input
                className={inputClass}
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder={t("form.clientAddress")}
              />
            </Field>
          </>
        )}

        <Field label={t("form.clientType")}>
          <div className="flex gap-2">
            {(["individual", "business"] as ClientType[]).map((ct) => (
              <button
                key={ct}
                onClick={() => setClientType(ct)}
                className={`flex-1 rounded-card border-2 py-2 text-sm font-medium transition-colors ${
                  clientType === ct
                    ? "border-primary bg-primary-light text-foreground"
                    : "border-border bg-surface text-muted-foreground"
                }`}
              >
                {t(`form.${ct}`)}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* Service section */}
      <div className="space-y-3">
        <SectionTitle>{t("form.serviceSection")}</SectionTitle>
        <Field label={t("form.description")}>
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("form.description")}
          />
        </Field>
        <Field label={t("form.amount")}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              €
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              className={`${inputClass} pl-7`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </Field>
        <Field label={t("form.issueDate")}>
          <input
            type="date"
            className={inputClass}
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </Field>

        {/* Factura simplificada toggle */}
        {canSimplificada && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={simplificada}
              onChange={(e) => setSimplificada(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary"
            />
            <div>
              <p className="text-sm text-foreground">{t("form.simplificada")}</p>
              <p className="text-xs text-muted-foreground">{t("form.simplificadaHint")}</p>
            </div>
          </label>
        )}
      </div>

      {/* Correction reason (rectificativa only) */}
      {rectificaId && (
        <div className="space-y-3">
          <SectionTitle>{t("form.correctionReason")}</SectionTitle>
          <Field label={t("form.correctionReason")}>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder={t("form.correctionReasonPlaceholder")}
            />
          </Field>
        </div>
      )}

      {/* Summary section */}
      <div className="space-y-2 rounded-card border border-border bg-surface p-4">
        <SectionTitle>{t("form.summarySection")}</SectionTitle>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("form.baseAmount")}</span>
            <span className="font-medium">{formatCurrency(calc.base)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {calc.ivaType === "exempt"
                ? t("form.ivaExempt")
                : t("form.ivaRate")}
            </span>
            <span className="font-medium">
              {calc.ivaType === "exempt" ? "—" : formatCurrency(calc.ivaAmount)}
            </span>
          </div>
          {calc.irpfAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("form.irpfLabel", { rate: calc.irpfRate })}
              </span>
              <span className="font-medium text-destructive">
                −{formatCurrency(calc.irpfAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
            <span className="font-bold text-foreground">{t("form.total")}</span>
            <span className="font-bold text-foreground text-base">
              {formatCurrency(calc.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-40">
        <Button
          onClick={handleIssue}
          disabled={!isValid || loading}
          className="w-full bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
          size="lg"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("form.issuing")}
            </span>
          ) : (
            t("form.issueButton")
          )}
        </Button>
      </div>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense>
      <NewInvoiceInner />
    </Suspense>
  );
}
