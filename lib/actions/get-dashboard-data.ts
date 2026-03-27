"use server";

import { auth } from "@/auth";
import type { Invoice } from "@/lib/types/invoice";

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO date string
  category?: string;
}

export interface DashboardData {
  invoices: Invoice[];
  expenses: Expense[];
  error?: string;
}

async function findFileId(
  accessToken: string,
  fileName: string,
  parentId: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    q: `name='${fileName}' and '${parentId}' in parents and trashed=false`,
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

async function readJsonFile<T>(
  accessToken: string,
  fileId: string,
): Promise<T> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Drive read failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getDashboardData(): Promise<DashboardData> {
  const session = await auth();
  if (!session?.access_token) {
    return { invoices: [], expenses: [], error: "No session" };
  }

  const token = session.access_token;

  try {
    // Find Autonomas folder
    const rootParams = new URLSearchParams({
      q: `name='Autonomas' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`,
      fields: "files(id)",
      pageSize: "1",
    });
    const rootRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?${rootParams}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!rootRes.ok) throw new Error(`Root lookup failed: ${rootRes.status}`);
    const rootData = await rootRes.json();
    const rootId = rootData.files?.[0]?.id;
    if (!rootId) throw new Error("Autonomas folder not found");

    // Find .autonomas hidden folder
    const hiddenId = await findFileId(token, ".autonomas", rootId);
    if (!hiddenId) throw new Error(".autonomas folder not found");

    // Read both files in parallel
    const [incomeId, expensesId] = await Promise.all([
      findFileId(token, "income.json", hiddenId),
      findFileId(token, "expenses.json", hiddenId),
    ]);

    const [invoices, expenses] = await Promise.all([
      incomeId
        ? readJsonFile<Invoice[]>(token, incomeId)
        : Promise.resolve([] as Invoice[]),
      expensesId
        ? readJsonFile<Expense[]>(token, expensesId)
        : Promise.resolve([] as Expense[]),
    ]);

    return { invoices, expenses };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { invoices: [], expenses: [], error: message };
  }
}
