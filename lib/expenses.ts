/**
 * Drive helpers for expense records and receipt images.
 *
 * All functions accept an accessToken so they work from both client
 * and server contexts (the browser uploads images directly to Drive).
 */

import { slugify } from "@/lib/slugify";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

// ─── Types ─────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | "combustible"
  | "seguros"
  | "servicios"
  | "otros";

export interface ExpenseRecord {
  id: number;
  date: string; // ISO YYYY-MM-DD
  vendor: string;
  vendorNif: string | null;
  total: number;
  ivaRate: number | null;
  ivaAmount: number | null;
  baseImponible: number | null;
  documentType: "factura" | "ticket_simplificado" | "otro" | null;
  category: ExpenseCategory;
  imagePath: string | null; // Drive file ID of receipt image, or null
  notes: string | null;
  createdAt: string; // ISO timestamp
}

// ─── Drive path helpers ────────────────────────────────────────────────────

function quarterLabel(date: Date): string {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${q}`;
}

async function findFolderByName(
  name: string,
  parentId: string,
  accessToken: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: "files(id)",
    pageSize: "1",
  });
  const res = await fetch(`${DRIVE_API}/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

async function findFileByName(
  name: string,
  parentId: string,
  accessToken: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    q: `name='${name}' and '${parentId}' in parents and trashed=false`,
    fields: "files(id)",
    pageSize: "1",
  });
  const res = await fetch(`${DRIVE_API}/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

async function ensureFolder(
  name: string,
  parentId: string,
  accessToken: string,
): Promise<string> {
  const existing = await findFolderByName(name, parentId, accessToken);
  if (existing) return existing;

  const res = await fetch(`${DRIVE_API}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create folder "${name}": ${body}`);
  }
  const data = await res.json();
  return data.id as string;
}

/**
 * Resolve the IDs needed for expense operations.
 * Returns null if the Drive structure is missing (e.g. onboarding incomplete).
 */
async function resolveFolders(accessToken: string): Promise<{
  gastosId: string;
  hiddenId: string;
} | null> {
  const rootId = await findFolderByName("Autonomas", "root", accessToken);
  if (!rootId) return null;

  const gastosId = await findFolderByName("Gastos", rootId, accessToken);
  const hiddenId = await findFolderByName(".autonomas", rootId, accessToken);
  if (!gastosId || !hiddenId) return null;

  return { gastosId, hiddenId };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Read all expense records from expenses.json.
 */
export async function readExpenses(accessToken: string): Promise<ExpenseRecord[]> {
  const folders = await resolveFolders(accessToken);
  if (!folders) return [];

  const fileId = await findFileByName("expenses.json", folders.hiddenId, accessToken);
  if (!fileId) return [];

  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? (data as ExpenseRecord[]) : [];
}

/**
 * Derive the next sequential expense ID from the existing records.
 * Returns 1 if there are no records yet.
 */
export async function nextExpenseId(
  existingExpenses: ExpenseRecord[],
): Promise<number> {
  if (existingExpenses.length === 0) return 1;
  return Math.max(...existingExpenses.map((e) => e.id)) + 1;
}

/**
 * Append a new expense record to expenses.json in Drive.
 */
export async function appendExpense(
  record: ExpenseRecord,
  accessToken: string,
): Promise<void> {
  const folders = await resolveFolders(accessToken);
  if (!folders) throw new Error("Drive structure not initialised");

  const existing = await readExpenses(accessToken);
  const updated = [...existing, record];

  await writeExpenses(updated, folders.hiddenId, accessToken);
}

/**
 * Update an existing expense record by id in expenses.json.
 */
export async function updateExpense(
  updatedRecord: ExpenseRecord,
  accessToken: string,
): Promise<void> {
  const folders = await resolveFolders(accessToken);
  if (!folders) throw new Error("Drive structure not initialised");

  const existing = await readExpenses(accessToken);
  const index = existing.findIndex((e) => e.id === updatedRecord.id);
  if (index === -1) throw new Error(`Expense id ${updatedRecord.id} not found`);

  const updated = [...existing];
  updated[index] = updatedRecord;

  await writeExpenses(updated, folders.hiddenId, accessToken);
}

/**
 * Delete an expense record by id from expenses.json.
 */
export async function deleteExpense(
  id: number,
  accessToken: string,
): Promise<void> {
  const folders = await resolveFolders(accessToken);
  if (!folders) throw new Error("Drive structure not initialised");

  const existing = await readExpenses(accessToken);
  const updated = existing.filter((e) => e.id !== id);

  await writeExpenses(updated, folders.hiddenId, accessToken);
}

/**
 * Upload a receipt JPEG to the correct Gastos/{YYYY-QN}/ folder.
 * Returns the Drive file ID of the uploaded image.
 */
export async function uploadReceiptImage(
  blob: Blob,
  expenseId: number,
  vendor: string,
  date: string, // YYYY-MM-DD
  accessToken: string,
): Promise<string> {
  const folders = await resolveFolders(accessToken);
  if (!folders) throw new Error("Drive structure not initialised");

  const expenseDate = new Date(date + "T00:00:00");
  const qlabel = quarterLabel(expenseDate);

  const quarterFolderId = await ensureFolder(qlabel, folders.gastosId, accessToken);

  const vendorSlug = slugify(vendor).slice(0, 30) || "gasto";
  const filename = `gasto_${String(expenseId).padStart(3, "0")}_${vendorSlug}_${date}.jpg`;

  const metadata = {
    name: filename,
    parents: [quarterFolderId],
    mimeType: "image/jpeg",
  };

  const formData = new FormData();
  formData.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  formData.append("file", new Blob([blob], { type: "image/jpeg" }));

  const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to upload receipt image: ${body}`);
  }

  const data = await res.json();
  return data.id as string;
}

// ─── Internal ──────────────────────────────────────────────────────────────

async function writeExpenses(
  records: ExpenseRecord[],
  hiddenFolderId: string,
  accessToken: string,
): Promise<void> {
  const fileId = await findFileByName("expenses.json", hiddenFolderId, accessToken);

  if (fileId) {
    // Update existing file
    const res = await fetch(`${UPLOAD_API}/files/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(records),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to write expenses.json: ${body}`);
    }
  } else {
    // Create new file
    const metadata = {
      name: "expenses.json",
      parents: [hiddenFolderId],
      mimeType: "application/json",
    };
    const formData = new FormData();
    formData.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    );
    formData.append(
      "file",
      new Blob([JSON.stringify(records)], { type: "application/json" }),
    );
    const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to create expenses.json: ${body}`);
    }
  }
}
