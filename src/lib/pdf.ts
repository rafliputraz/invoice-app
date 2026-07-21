import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

/**
 * Render the on-screen invoice document into a downloadable A4 PDF.
 *
 * We reuse the exact preview DOM (`#invoice-print`, laid out at 194mm — A4's
 * printable width) rather than re-drawing the invoice, so the file matches what
 * the user sees. html2canvas-pro (not plain html2canvas) is required because
 * Tailwind v4 emits `oklch()` colors that the original library cannot parse.
 *
 * @param element   The invoice root node to capture (the `#invoice-print` div).
 * @param fileName  Base name for the download, without extension.
 */
export async function downloadInvoicePdf(
  element: HTMLElement,
  fileName: string
): Promise<void> {
  // Higher scale => crisper text/lines. 3x of a 194mm page is ~2480px wide,
  // roughly 300dpi at A4, which prints cleanly.
  const canvas = await html2canvas(element, {
    scale: 3,
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8; // matches the @page 8mm print margin

  const usableWidth = pageWidth - margin * 2;
  // Preserve the invoice's aspect ratio when fitting it to the page width.
  const imgHeight = (canvas.height / canvas.width) * usableWidth;
  const imgData = canvas.toDataURL("image/png");

  if (imgHeight <= pageHeight - margin * 2) {
    // Fits on one page.
    pdf.addImage(imgData, "PNG", margin, margin, usableWidth, imgHeight);
  } else {
    // Taller than one page: slice the image across pages by shifting the
    // Y offset, keeping the same full-width image on each page.
    const usableHeight = pageHeight - margin * 2;
    let heightLeft = imgHeight;
    let position = margin;
    pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
    heightLeft -= usableHeight;
    while (heightLeft > 0) {
      pdf.addPage();
      position = margin - (imgHeight - heightLeft);
      pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
      heightLeft -= usableHeight;
    }
  }

  pdf.save(`${fileName}.pdf`);
}

/** Filesystem-safe base name for an invoice PDF (falls back to "invoice"). */
export function invoicePdfName(invoiceNo: string): string {
  const cleaned = invoiceNo.replace(/[\\/:*?"<>|]+/g, "-").trim();
  return cleaned || "invoice";
}
