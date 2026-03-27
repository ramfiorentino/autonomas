"use server";

import { auth } from "@/auth";
import { getFacturasFolderId } from "@/lib/actions/get-invoices";

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

function getQuarterLabel(date: Date): string {
  const year = date.getFullYear();
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `${year}-Q${q}`;
}

export async function ensureQuarterFolder(issueDate: Date): Promise<string> {
  const session = await auth();
  if (!session?.access_token) throw new Error("No active session");

  const token = session.access_token;
  const folderName = getQuarterLabel(issueDate);

  const facturasId = await getFacturasFolderId(token);
  if (!facturasId) throw new Error("Facturas folder not found");

  const existing = await findFolderIdByName(token, folderName, facturasId);
  if (existing) return existing;

  // Create the quarter folder
  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [facturasId],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create quarter folder: ${body}`);
  }

  const data = await res.json();
  return data.id as string;
}
