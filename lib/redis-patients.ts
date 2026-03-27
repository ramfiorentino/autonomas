import { redis } from "@/lib/kv";
import type { PatientRecord } from "@/lib/types/booking";

const patientsKey = (userId: string) => `patients:${userId}`;

/** Key is NIF if provided, otherwise email */
function patientKey(nif: string | null, email: string): string {
  return nif?.trim() || email.toLowerCase();
}

export async function upsertPatient(
  userId: string,
  patient: { name: string; email: string; nif: string | null },
): Promise<void> {
  const key = patientsKey(userId);
  const field = patientKey(patient.nif, patient.email);
  const record: PatientRecord = {
    name: patient.name,
    email: patient.email,
    nif: patient.nif,
    lastBookingAt: new Date().toISOString(),
  };
  await redis.hset(key, { [field]: record });
}

export async function getPatient(
  userId: string,
  key: string, // NIF or email
): Promise<PatientRecord | null> {
  const result = await redis.hget<PatientRecord>(patientsKey(userId), key);
  return result ?? null;
}
