"use client";

import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ChevronRight } from "lucide-react";
import type { Booking, BookingStatus } from "@/lib/types/booking";

function StatusBadge({ status }: { status: BookingStatus }) {
  const t = useTranslations("appointments.statuses");
  const classes: Record<BookingStatus, string> = {
    pending: "bg-amber-100 text-amber-700",
    invoiced: "bg-green-100 text-green-700",
    cancelled: "bg-border text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes[status]}`}>
      {t(status)}
    </span>
  );
}

export function AppointmentRow({ booking }: { booking: Booking }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("appointments");

  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(booking.dateTime));

  function handleTap() {
    if (booking.status !== "pending") return;
    const params = new URLSearchParams({
      patientName: booking.patientName,
      dateTime: booking.dateTime,
      appointmentType: booking.appointmentType,
      bookingId: booking.id,
      ...(booking.patientNif ? { patientNif: booking.patientNif } : {}),
    });
    router.push(`/invoices/new?${params.toString()}`);
  }

  return (
    <button
      onClick={handleTap}
      disabled={booking.status !== "pending"}
      className="w-full flex items-center justify-between p-4 text-left hover:bg-primary-light transition-colors disabled:opacity-70 disabled:cursor-default"
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{booking.patientName}</p>
          <StatusBadge status={booking.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          {formattedDate} · {booking.slot.start}
        </p>
        <p className="text-xs text-muted-foreground">{booking.appointmentType}</p>
      </div>
      {booking.status === "pending" && (
        <div className="flex items-center gap-1 flex-shrink-0 ml-3">
          <span className="text-xs text-muted-foreground">{t("createInvoice")}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </button>
  );
}
