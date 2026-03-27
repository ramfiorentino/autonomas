"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Settings, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentRow } from "@/components/appointments/AppointmentRow";
import { getBookingsForCitasTab, cancelBooking } from "@/lib/actions/get-bookings";
import type { Booking, BookingStatus } from "@/lib/types/booking";

type StatusFilter = "all" | BookingStatus;
const FILTERS: StatusFilter[] = ["all", "pending", "invoiced", "cancelled"];

export default function CitasPage() {
  const t = useTranslations("appointments");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    getBookingsForCitasTab().then((data) => {
      setBookings(data);
      setLoading(false);
    });
  }, []);

  async function handleCancel(bookingId: string) {
    await cancelBooking(bookingId);
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: "cancelled" as const } : b,
      ),
    );
  }

  const hasCalendarError = bookings.some(
    (b) => b.calendarError && b.status === "pending",
  );

  const filtered =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-6 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
          <Button
            onClick={() => router.push("/appointments/setup")}
            variant="outline"
            size="sm"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {hasCalendarError && (
          <div className="flex items-center gap-2 rounded-card border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">{t("calendarErrorBanner")}</p>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-primary text-white"
                  : "bg-border text-muted-foreground hover:bg-border/70"
              }`}
            >
              {f === "all" ? t("allStatuses") : t(`statuses.${f}`)}
            </button>
          ))}
        </div>
      </div>

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
              onClick={() => router.push("/appointments/setup")}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {t("setupAvailability")}
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border border-t border-border">
            {filtered.map((booking) => (
              <div key={booking.id}>
                <AppointmentRow booking={booking} />
                {booking.status === "pending" && (
                  <div className="px-4 pb-3">
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="text-xs text-destructive hover:underline"
                    >
                      {t("cancelAppointment")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
