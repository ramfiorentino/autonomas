"use server";

import { auth } from "@/auth";
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

async function findFolderIdByName(
  accessToken: string,
  name: string,
  parentId: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
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

export async function getAutonomasHiddenFolderId(
  accessToken: string,
): Promise<string | null> {
  const rootId = await findFolderIdByName(accessToken, "Autonomas", "root");
  if (!rootId) return null;
  return findFolderIdByName(accessToken, ".autonomas", rootId);
}

export async function getFacturasFolderId(
  accessToken: string,
): Promise<string | null> {
  const rootId = await findFolderIdByName(accessToken, "Autonomas", "root");
  if (!rootId) return null;
  return findFolderIdByName(accessToken, "Facturas", rootId);
}

export async function getInvoices(): Promise<Invoice[]> {
  const session = await auth();
  if (!session?.access_token) return [];

  const token = session.access_token;

  try {
    const hiddenId = await getAutonomasHiddenFolderId(token);
    if (!hiddenId) return [];

    const fileId = await findFileIdByName(token, "income.json", hiddenId);
    if (!fileId) return [];

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as Invoice[]) : [];
  } catch {
    return [];
  }
}
