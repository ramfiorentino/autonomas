"use client";

import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ChevronRight } from "lucide-react";
import type { PendingAppointment } from "@/lib/actions/get-pending-appointments";

interface PendingAppointmentsProps {
  appointments: PendingAppointment[];
  hasMore: boolean;
}

export function PendingAppointments({ appointments, hasMore }: PendingAppointmentsProps) {
  const t = useTranslations("dashboard.appointments");
  const locale = useLocale();
  const router = useRouter();

  function handleAppointmentClick(appt: PendingAppointment) {
    const params = new URLSearchParams({
      patientName: appt.patientName,
      dateTime: appt.dateTime,
      appointmentType: appt.appointmentType,
    });
    router.push(`/invoices/new?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{t("title")}</p>
        {hasMore && (
          <button
            onClick={() => router.push("/appointments")}
            className="text-xs text-primary hover:underline"
          >
            {t("seeAll")}
          </button>
        )}
      </div>

      {appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">{t("empty")}</p>
      ) : (
        <div className="divide-y divide-border rounded-card border border-border bg-surface overflow-hidden">
          {appointments.slice(0, 5).map((appt) => {
            const dt = new Date(appt.dateTime);
            const formattedDate = new Intl.DateTimeFormat(locale, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }).format(dt);

            return (
              <button
                key={appt.id}
                onClick={() => handleAppointmentClick(appt)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-primary-light transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {appt.patientName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formattedDate} · {appt.appointmentType}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
