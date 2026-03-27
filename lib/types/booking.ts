export type BookingStatus = "pending" | "invoiced" | "cancelled";

export interface TimeSlot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface WorkingHours {
  enabled: boolean;
  from: string; // "HH:MM"
  to: string;   // "HH:MM"
}

export interface AvailabilityRule {
  slotDuration: 20 | 30 | 45 | 60; // minutes
  weekdays: {
    mon: WorkingHours;
    tue: WorkingHours;
    wed: WorkingHours;
    thu: WorkingHours;
    fri: WorkingHours;
    sat: WorkingHours;
    sun: WorkingHours;
  };
  blockedDates: string[]; // ISO date strings "YYYY-MM-DD"
}

export interface PatientRecord {
  name: string;
  email: string;
  nif: string | null;
  lastBookingAt: string; // ISO datetime
}

export interface Booking {
  id: string;
  userId: string;
  patientName: string;
  patientEmail: string;
  patientNif: string | null;
  slot: TimeSlot;
  date: string;          // "YYYY-MM-DD"
  dateTime: string;      // ISO datetime (slot start)
  appointmentType: string;
  status: BookingStatus;
  calendarError?: boolean;
  calendarEventId?: string;
  invoiceId?: string;
  createdAt: string;     // ISO datetime
}
