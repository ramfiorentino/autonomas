"use server";

import { auth } from "@/auth";
import { getAutonomasHiddenFolderId } from "@/lib/actions/get-invoices";
import type { Invoice } from "@/lib/types/invoice";

async function findFileIdByName(
  accessToken: string,
  name: string,
  parentId: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    q: `name='${name}' and '${parentId}' in parents and trashed=false`,
    fields: "files(id)",
    pageSize: "1",
  });
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

export interface SaveInvoiceResult {
  success: boolean;
  error?: string;
}

/**
 * Read-modify-write: reads income.json, appends or updates the invoice, writes back.
 * Pass `relatedInvoices` for atomic multi-invoice updates (e.g. issuing a rectificativa
 * that also marks the original as rectified).
 */
export async function saveInvoice(
  invoice: Invoice,
  relatedInvoices?: Invoice[],
): Promise<SaveInvoiceResult> {
  const session = await auth();
  if (!session?.access_token) {
    return { success: false, error: "No active session" };
  }

  const token = session.access_token;

  try {
    const hiddenId = await getAutonomasHiddenFolderId(token);
    if (!hiddenId) return { success: false, error: "Drive folder not found" };

    const fileId = await findFileIdByName(token, "income.json", hiddenId);
    if (!fileId) return { success: false, error: "income.json not found" };

    // Read current data
    const readRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!readRes.ok) throw new Error(`Read failed: ${readRes.status}`);
    const current: Invoice[] = await readRes.json();

    // Apply changes
    const updates = [invoice, ...(relatedInvoices ?? [])];
    let invoices = [...current];
    for (const updated of updates) {
      const idx = invoices.findIndex((inv) => inv.id === updated.id);
      if (idx >= 0) {
        invoices[idx] = updated;
      } else {
        invoices.push(updated);
      }
    }

    // Write back
    const writeRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoices),
      },
    );
    if (!writeRes.ok) throw new Error(`Write failed: ${writeRes.status}`);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
