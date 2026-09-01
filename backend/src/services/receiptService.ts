import puppeteer from 'puppeteer-core';
import { env } from '../config/env';
import { buildReceiptHtml } from './receiptTemplate';
import { Cart, CartItem, Merchant, ReceiptFormat } from '../types';

/**
 * Renders the receipt HTML through headless Chromium into a PDF or PNG
 * buffer. Rendering (rather than a pure PDF-primitives lib) is what gives
 * correct Arabic shaping/bidi for free.
 */
export async function renderReceipt(
  merchant: Merchant,
  cart: Cart,
  items: CartItem[],
  format: ReceiptFormat,
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  const html = buildReceiptHtml(merchant, cart, items);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: env.puppeteerExecutablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    if (format === 'pdf') {
      const buffer = await page.pdf({ format: 'a5', printBackground: true, margin: { top: '0', bottom: '0' } });
      return { buffer: Buffer.from(buffer), contentType: 'application/pdf', extension: 'pdf' };
    }

    await page.setViewport({ width: 640, height: 900 });
    const buffer = await page.screenshot({ type: 'png', fullPage: true });
    return { buffer: Buffer.from(buffer), contentType: 'image/png', extension: 'png' };
  } finally {
    await browser.close();
  }
}
