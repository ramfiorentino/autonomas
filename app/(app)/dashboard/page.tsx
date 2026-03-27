"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { Greeting } from "@/components/dashboard/Greeting";
import { IrpfCard } from "@/components/dashboard/IrpfCard";
import { DeadlineCard } from "@/components/dashboard/DeadlineCard";
import { PendingAppointments } from "@/components/dashboard/PendingAppointments";
import { QuarterSummary } from "@/components/dashboard/QuarterSummary";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { getDashboardData } from "@/lib/actions/get-dashboard-data";
import { getPendingAppointments } from "@/lib/actions/get-pending-appointments";
import type { Invoice } from "@/lib/types/invoice";
import type { Expense } from "@/lib/actions/get-dashboard-data";
import type { PendingAppointment } from "@/lib/actions/get-pending-appointments";

export default function DashboardPage() {
  const t = useTranslations("dashboard");

  const [loading, setLoading] = useState(true);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [appointments, setAppointments] = useState<PendingAppointment[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setDriveError(null);

    const [driveData, apptData] = await Promise.all([
      getDashboardData(),
      getPendingAppointments(),
    ]);

    if (driveData.error) {
      setDriveError(driveData.error);
    } else {
      setInvoices(driveData.invoices);
      setExpenses(driveData.expenses);
    }

    setAppointments(apptData.appointments);
    setHasMore(apptData.hasMore);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6 p-4 pb-8">
      {/* Greeting — always visible */}
      <Greeting />

      {/* Quick actions — always visible */}
      <QuickActions />

      {/* Drive error banner — non-blocking */}
      {driveError && !loading && (
        <div className="flex items-center justify-between rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{t("error")}</p>
          <button
            onClick={fetchData}
            className="flex items-center gap-1 text-xs text-destructive hover:underline"
            aria-label={t("retry")}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("retry")}
          </button>
        </div>
      )}

      {/* IRPF card */}
      {loading ? (
        <Skeleton className="h-28 w-full rounded-card" />
      ) : (
        !driveError && <IrpfCard invoices={invoices} />
      )}

      {/* Deadline card — no Drive data needed */}
      <DeadlineCard />

      {/* Quarter summary */}
      {loading ? (
        <div className="flex gap-3">
          <Skeleton className="h-20 flex-1 rounded-card" />
          <Skeleton className="h-20 flex-1 rounded-card" />
        </div>
      ) : (
        !driveError && <QuarterSummary invoices={invoices} expenses={expenses} />
      )}

      {/* Pending appointments */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-14 w-full rounded-card" />
          <Skeleton className="h-14 w-full rounded-card" />
        </div>
      ) : (
        <PendingAppointments appointments={appointments} hasMore={hasMore} />
      )}
    </div>
  );
}
