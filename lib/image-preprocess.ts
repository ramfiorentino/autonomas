/**
 * Client-side image preprocessing pipeline.
 *
 * Pipeline:
 * 1. Cap long edge at 1600px using Canvas drawImage (also converts HEIC → JPEG
 *    on browsers that natively decode HEIC, e.g. Safari on macOS/iOS).
 * 2. Export as JPEG quality 0.82.
 * 3. If blob > 500KB, re-export at quality 0.70.
 *
 * Returns the preprocessed JPEG Blob ready for OCR and Drive upload.
 */
export async function preprocessImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const MAX_LONG_EDGE = 1600;
  let { width, height } = bitmap;

  if (Math.max(width, height) > MAX_LONG_EDGE) {
    const scale = MAX_LONG_EDGE / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvasToBlob(canvas, 0.82);

  if (blob.size > 500 * 1024) {
    return canvasToBlob(canvas, 0.7);
  }

  return blob;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob returned null"));
      },
      "image/jpeg",
      quality,
    );
  });
}
