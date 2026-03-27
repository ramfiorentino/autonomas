"use server";

import { auth } from "@/auth";
import { ensureQuarterFolder } from "@/lib/actions/ensure-quarter-folder";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface UploadPdfResult {
  pdfPath: string;
  fileId: string;
}

export async function uploadInvoicePdf(
  pdfBase64: string,
  invoiceNumber: string,
  clientName: string,
  issueDate: string,
): Promise<UploadPdfResult> {
  const session = await auth();
  if (!session?.access_token) throw new Error("No active session");

  const token = session.access_token;
  const date = new Date(issueDate);
  const quarterFolderId = await ensureQuarterFolder(date);

  const fileName = `${invoiceNumber}_${slugify(clientName)}.pdf`;

  // Decode base64 to binary
  const binaryStr = atob(pdfBase64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "application/pdf" });

  // Multipart upload
  const metadata = {
    name: fileName,
    parents: [quarterFolderId],
    mimeType: "application/pdf",
  };

  const body = new FormData();
  body.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  body.append("file", blob);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PDF upload failed: ${text}`);
  }

  const data = await res.json();
  return {
    pdfPath: data.webViewLink ?? `https://drive.google.com/file/d/${data.id}/view`,
    fileId: data.id,
  };
}
