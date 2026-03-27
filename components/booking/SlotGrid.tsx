"use client";

import { useState, useEffect } from "react";
import { getAvailableSlots } from "@/lib/actions/get-available-slots";
import type { TimeSlot } from "@/lib/types/booking";

interface SlotGridProps {
  userId: string;
  date: string; // "YYYY-MM-DD"
  lang: "es" | "en";
  selectedSlot: TimeSlot | null;
  onSlotSelect: (slot: TimeSlot) => void;
}

export function SlotGrid({ userId, date, lang, selectedSlot, onSlotSelect }: SlotGridProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAvailableSlots(userId, date).then((s) => {
      setSlots(s);
      setLoading(false);
    });
  }, [userId, date]);

  const noSlots = lang === "es"
    ? "No hay horas disponibles para este día"
    : "No available slots for this day";

  if (loading) {
    return (
      <div className="h-20 flex items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (slots.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">{noSlots}</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {slots.map((slot) => {
        const isSelected = selectedSlot?.start === slot.start;
        return (
          <button
            key={slot.start}
            onClick={() => onSlotSelect(slot)}
            className={`rounded-card py-2 text-sm font-medium border transition-colors ${
              isSelected
                ? "bg-primary text-white border-primary"
                : "bg-surface border-border text-foreground hover:border-primary/50"
            }`}
          >
            {slot.start}
          </button>
        );
      })}
    </div>
  );
}
