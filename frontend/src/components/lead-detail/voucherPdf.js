/**
 * Renders voucher HTML into a PDF and triggers browser download.
 * Mirrors the robust quotation PDF path (iframe + softened CSS + blob download).
 */
import { downloadBlob } from '../../lib/quotationPdfBlob';

function waitForIframeDocument(doc, win) {
  return new Promise((resolve) => {
    const done = () => resolve();
    if (doc.readyState === 'complete') {
      setTimeout(done, 400);
      return;
    }
    win.addEventListener('load', () => setTimeout(done, 400), { once: true });
    setTimeout(done, 3000);
  });
}

function canvasToImageData(canvas) {
  try {
    return { data: canvas.toDataURL('image/jpeg', 0.92), format: 'JPEG' };
  } catch {
    return { data: canvas.toDataURL('image/png', 1.0), format: 'PNG' };
  }
}

function safePdfFilename(filename) {
  return String(filename || 'payment-voucher.pdf')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/\.pdf$/i, '')
    .concat('.pdf');
}

async function renderVoucherHtmlToCanvas(html) {
  const { default: html2canvas } = await import('html2canvas');

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Voucher PDF');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;left:-12000px;top:0;width:720px;height:1100px;border:0;opacity:1;pointer-events:none;background:#fff;';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument || win.document;

  try {
    doc.open();
    doc.write(html);
    doc.close();

    await waitForIframeDocument(doc, win);

    const target = doc.body || doc.documentElement;
    if (!target) throw new Error('Voucher document is empty');

    target.style.margin = '0';
    target.style.padding = '4px';
    target.style.background = '#ffffff';
    target.style.width = '720px';

    const contentHeight = Math.max(target.scrollHeight, target.offsetHeight, 700);
    iframe.style.height = `${contentHeight + 20}px`;

    // Soften CSS that html2canvas often fails on
    doc.querySelectorAll('*').forEach((el) => {
      if (!(el instanceof win.HTMLElement)) return;
      const style = win.getComputedStyle(el);
      if (style.backdropFilter && style.backdropFilter !== 'none') {
        el.style.backdropFilter = 'none';
      }
      if (style.filter && style.filter !== 'none') {
        el.style.filter = 'none';
      }
      if (style.boxShadow && style.boxShadow !== 'none') {
        el.style.boxShadow = 'none';
      }
    });

    const scale = contentHeight > 10000 ? 1 : 1.5;
    const canvas = await html2canvas(target, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 12000,
      windowWidth: 720,
      width: 720,
      height: contentHeight,
      scrollX: 0,
      scrollY: 0,
    });

    if (!canvas?.width || !canvas?.height) {
      throw new Error('Voucher PDF render produced an empty page');
    }
    return canvas;
  } finally {
    iframe.remove();
  }
}

export async function downloadVoucherPdf(html, filename = 'payment-voucher.pdf') {
  if (!html) throw new Error('Voucher HTML missing');

  const { jsPDF } = await import('jspdf');
  const canvas = await renderVoucherHtmlToCanvas(html);
  const { data: imgData, format } = canvasToImageData(canvas);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  // Always fit on a single A4 page
  let imgWidth = usableWidth;
  let imgHeight = (canvas.height * imgWidth) / canvas.width;
  if (imgHeight > usableHeight) {
    const scale = usableHeight / imgHeight;
    imgHeight = usableHeight;
    imgWidth = usableWidth * scale;
  }
  const x = margin + (usableWidth - imgWidth) / 2;
  const y = margin + Math.max(0, (usableHeight - imgHeight) / 2) * 0.15;

  pdf.addImage(imgData, format, x, y, imgWidth, imgHeight);

  const safeName = safePdfFilename(filename);
  // Blob download is more reliable than pdf.save() on mobile / in-app browsers
  downloadBlob(pdf.output('blob'), safeName);
  return safeName;
}

export function downloadVoucherHtml(html, filename = 'payment-voucher.html') {
  if (!html) throw new Error('Voucher HTML missing');
  const safeName = String(filename || 'payment-voucher.html')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/\.(pdf|html)$/i, '')
    .concat('.html');
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, safeName);
  return safeName;
}

/**
 * Print voucher via hidden iframe (avoids popup blockers).
 */
export async function printVoucherHtml(html, title = 'Payment Voucher') {
  if (!html) throw new Error('Voucher HTML missing');

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', title);
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument || win.document;
  doc.open();
  doc.write(html);
  doc.close();

  await waitForIframeDocument(doc, win);

  try {
    win.focus();
    win.print();
  } finally {
    setTimeout(() => iframe.remove(), 1500);
  }
}
