import jsQR from "jsqr";

/**
 * Fields that can be extracted from a Verifactu QR code.
 * All fields are optional — only populate what was found with confidence.
 */
export interface QrFields {
  vendorNif: string | null;
  date: string | null; // ISO YYYY-MM-DD
  total: number | null;
}

/**
 * Verifactu QR URL pattern.
 * Example: https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=B12345678&numserie=...&fecha=01-01-2025&importe=47.00
 */
const VERIFACTU_PATTERN = /https?:\/\/(?:www\d*\.)?aeat\.es\//i;

/**
 * Scan a preprocessed image Blob for Verifactu QR codes using jsQR.
 *
 * Returns parsed QR fields or null if no valid Verifactu QR was found.
 * Non-Verifactu QR codes are silently ignored.
 */
export async function scanQr(blob: Blob): Promise<QrFields | null> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);

  if (!code?.data) return null;

  const raw = code.data;

  if (!VERIFACTU_PATTERN.test(raw)) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const nif = url.searchParams.get("nif");
  const fecha = url.searchParams.get("fecha"); // DD-MM-YYYY or YYYY-MM-DD
  const importe = url.searchParams.get("importe");

  const vendorNif = nif ? nif.toUpperCase() : null;

  let date: string | null = null;
  if (fecha) {
    // Handle DD-MM-YYYY
    const ddmm = fecha.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddmm) {
      date = `${ddmm[3]}-${ddmm[2]}-${ddmm[1]}`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      date = fecha;
    }
  }

  const total = importe ? parseFloat(importe.replace(",", ".")) : null;

  return {
    vendorNif,
    date,
    total: total !== null && !isNaN(total) ? total : null,
  };
}
