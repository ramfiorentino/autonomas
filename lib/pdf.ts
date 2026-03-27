import type { Invoice } from "@/lib/types/invoice";

/**
 * Generates a PDF blob for the given invoice.
 * Uses @react-pdf/renderer's pdf() function.
 * Must only be called client-side (ssr: false).
 */
export async function generateInvoicePdf(invoice: Invoice): Promise<Blob> {
  // Dynamic import keeps @react-pdf/renderer out of the server bundle
  const { pdf, Document } = await import("@react-pdf/renderer");
  const { InvoicePdf } = await import("@/components/invoice/InvoicePdf");
  const { createElement } = await import("react");

  // Cast needed: pdf() expects DocumentProps element; InvoicePdf wraps Document internally
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(InvoicePdf, { invoice }) as any;
  const instance = pdf(element);
  return instance.toBlob();
}

/**
 * Converts a Blob to a base64 string for passing to server actions.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the data URL prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
