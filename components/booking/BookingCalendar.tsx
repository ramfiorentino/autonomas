"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getAvailableDates } from "@/lib/actions/get-available-slots";

interface BookingCalendarProps {
  userId: string;
  lang: "es" | "en";
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
}

const MONTHS_ES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
];
const MONTHS_EN = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS_ES = ["Lu","Ma","Mi","Ju","Vi","Sa","Do"];
const DAYS_EN = ["Mo","Tu","We","Th","Fr","Sa","Su"];

export function BookingCalendar({ userId, lang, onDateSelect, selectedDate }: BookingCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchDates = useCallback(async () => {
    setLoading(true);
    const dates = await getAvailableDates(userId, year, month);
    setAvailableDates(new Set(dates));
    setLoading(false);
  }, [userId, year, month]);

  useEffect(() => { fetchDates(); }, [fetchDates]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const firstDayMon = (firstDay + 6) % 7; // shift so Mon=0
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDayMon).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = lang === "es"
    ? `${MONTHS_ES[month - 1]} ${year}`
    : `${MONTHS_EN[month - 1]} ${year}`;
  const dayLabels = lang === "es" ? DAYS_ES : DAYS_EN;

  return (
    <div className="space-y-3">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-border">
          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <span className="text-sm font-semibold text-foreground capitalize">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-border">
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {dayLabels.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Date grid */}
      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isAvailable = availableDates.has(dateStr);
            const isSelected = selectedDate === dateStr;
            const isPast = new Date(dateStr) < new Date(new Date().toDateString());

            return (
              <button
                key={i}
                disabled={!isAvailable || isPast}
                onClick={() => onDateSelect(dateStr)}
                className={`
                  aspect-square flex items-center justify-center rounded-full text-sm transition-colors
                  ${isSelected ? "bg-primary text-white font-semibold" : ""}
                  ${isAvailable && !isSelected && !isPast ? "hover:bg-primary/10 text-foreground" : ""}
                  ${!isAvailable || isPast ? "text-muted-foreground/40 cursor-not-allowed" : ""}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
