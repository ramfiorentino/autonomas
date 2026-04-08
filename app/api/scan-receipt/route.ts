import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const MISTRAL_OCR_URL = "https://api.mistral.ai/v1/ocr";

export interface OcrResult {
  vendorName: string | null;
  vendorNif: string | null;
  date: string | null; // ISO date string YYYY-MM-DD
  total: number | null;
  ivaRate: number | null;
  ivaAmount: number | null;
  baseImponible: number | null;
  documentType: "factura" | "ticket_simplificado" | "otro" | null;
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.tier !== "paid" || (session.status !== "active" && session.status !== "past_due")) {
    return NextResponse.json({ error: "Paid tier required" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  let imageBase64: string;
  let mimeType: string;

  try {
    const formData = await req.formData();
    const file = formData.get("image");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Missing image field" }, { status: 400 });
    }
    const bytes = await file.arrayBuffer();
    imageBase64 = Buffer.from(bytes).toString("base64");
    mimeType = file.type || "image/jpeg";
  } catch {
    return NextResponse.json({ error: "Failed to read image" }, { status: 400 });
  }

  const mistralKey = process.env.MISTRAL_API_KEY;
  if (!mistralKey) {
    console.error("[scan-receipt] MISTRAL_API_KEY not set");
    return NextResponse.json({ error: "OCR service not configured" }, { status: 500 });
  }

  let rawText: string;
  try {
    const mistralRes = await fetch(MISTRAL_OCR_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mistralKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: {
          type: "image_url",
          image_url: `data:${mimeType};base64,${imageBase64}`,
        },
      }),
    });

    if (!mistralRes.ok) {
      const body = await mistralRes.text();
      console.error("[scan-receipt] Mistral error:", mistralRes.status, body);
      return NextResponse.json({ error: "OCR failed" }, { status: 502 });
    }

    const mistralData = await mistralRes.json();
    // Mistral OCR returns pages[].markdown
    rawText = (mistralData.pages ?? [])
      .map((p: { markdown?: string }) => p.markdown ?? "")
      .join("\n");
  } catch (err) {
    console.error("[scan-receipt] Mistral fetch error:", err);
    return NextResponse.json({ error: "OCR service unavailable" }, { status: 502 });
  }

  const result = parseOcrText(rawText);
  return NextResponse.json(result);
}

function parseOcrText(text: string): OcrResult {
  // Determine document type
  let documentType: OcrResult["documentType"] = null;
  if (/factura\s+simplificada/i.test(text) || /ticket\s+simplificado/i.test(text)) {
    documentType = "ticket_simplificado";
  } else if (/factura/i.test(text)) {
    documentType = "factura";
  } else if (/ticket|recibo|receipt/i.test(text)) {
    documentType = "otro";
  }

  // Extract NIF/CIF — Spanish format: 8 digits + letter (NIF), or letter + 7 digits + letter (CIF)
  const nifMatch = text.match(/\b([A-HJ-NP-SUVW]\d{7}[0-9A-J]|\d{8}[A-Z])\b/i);
  const vendorNif = nifMatch ? nifMatch[0].toUpperCase() : null;

  // Extract date — look for DD/MM/YYYY or YYYY-MM-DD patterns
  let date: string | null = null;
  const dateSlash = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  const dateIso = text.match(/\b(20\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
  if (dateIso) {
    const [, year, month, day] = dateIso;
    date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  } else if (dateSlash) {
    const [, day, month, year] = dateSlash;
    date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Extract total — look for "total" followed by a number
  let total: number | null = null;
  const totalMatch = text.match(/total[^\d€]*([€$]?\s*\d+[.,]\d{2})/i);
  if (totalMatch) {
    total = parseAmount(totalMatch[1]);
  }

  // Extract IVA rate — look for % near "iva"
  let ivaRate: number | null = null;
  const ivaRateMatch = text.match(/iva[^\d%]*(\d+)\s*%/i) ??
    text.match(/(\d+)\s*%\s*iva/i);
  if (ivaRateMatch) {
    const rate = parseInt(ivaRateMatch[1], 10);
    if ([4, 10, 21].includes(rate)) {
      ivaRate = rate;
    }
  }

  // Extract IVA amount
  let ivaAmount: number | null = null;
  const ivaAmountMatch = text.match(/(?:cuota\s+iva|iva\s+repercutido|importe\s+iva)[^\d€]*([€$]?\s*\d+[.,]\d{2})/i);
  if (ivaAmountMatch) {
    ivaAmount = parseAmount(ivaAmountMatch[1]);
  }

  // Extract base imponible
  let baseImponible: number | null = null;
  const baseMatch = text.match(/base\s+imponible[^\d€]*([€$]?\s*\d+[.,]\d{2})/i) ??
    text.match(/subtotal[^\d€]*([€$]?\s*\d+[.,]\d{2})/i);
  if (baseMatch) {
    baseImponible = parseAmount(baseMatch[1]);
  }

  // If we have total and ivaAmount but no base, derive it
  if (total !== null && ivaAmount !== null && baseImponible === null) {
    baseImponible = Math.round((total - ivaAmount) * 100) / 100;
  }

  // Extract vendor name — heuristic: first non-empty line that isn't a date/number/address
  let vendorName: string | null = null;
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 6)) {
    // Skip lines that are mostly numbers, dates, or very short
    if (line.length < 3) continue;
    if (/^\d/.test(line)) continue;
    if (/^(fecha|date|nif|cif|total|iva|base|ticket|factura|recibo)/i.test(line)) continue;
    // Likely a vendor name
    vendorName = line.replace(/[*#_]/g, "").trim() || null;
    if (vendorName) break;
  }
  // Ignore if it looks like boilerplate
  if (vendorName && /^(autonomas|receipt|invoice|ticket)/i.test(vendorName)) {
    vendorName = null;
  }

  return {
    vendorName,
    vendorNif,
    date,
    total,
    ivaRate,
    ivaAmount,
    baseImponible,
    documentType,
  };
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[€$\s]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}
