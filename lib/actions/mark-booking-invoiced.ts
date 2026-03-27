"use server";

import { auth } from "@/auth";
import { updateBookingStatus } from "@/lib/redis-booking";

export async function markBookingInvoiced(
  bookingId: string,
  invoiceId: string,
): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false };

  await updateBookingStatus(session.user.id, bookingId, "invoiced", {
    invoiceId,
  });
  return { success: true };
}
