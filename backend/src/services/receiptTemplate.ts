import { Cart, CartItem, Merchant } from '../types';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

const PAYMENT_LABEL_AR: Record<Cart['payment_method'], string> = {
  cod: 'الدفع عند الاستلام',
  online: 'الدفع الإلكتروني',
  bank_transfer: 'تحويل بنكي',
};

/**
 * Builds the RTL receipt HTML rendered by receiptService (via headless
 * Chromium) into a PDF or PNG. Rendering through a real browser — rather
 * than a PDF-primitives library — is what makes Arabic text shape and
 * bidi-reorder correctly with zero extra font-shaping code.
 */
export function buildReceiptHtml(merchant: Merchant, cart: Cart, items: CartItem[]): string {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td class="name">${escapeHtml(item.name_snapshot)}${
            Object.keys(item.selected_options ?? {}).length
              ? `<div class="opts">${Object.entries(item.selected_options)
                  .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(String(v))}`)
                  .join(' · ')}</div>`
              : ''
          }</td>
          <td class="num">${item.quantity}</td>
          <td class="num">${Number(item.unit_price).toLocaleString('ar-DZ')}</td>
          <td class="num">${(Number(item.unit_price) * item.quantity).toLocaleString('ar-DZ')}</td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Cairo', 'Segoe UI', sans-serif;
    margin: 0;
    padding: 40px;
    color: #152420;
    background: #ffffff;
    direction: rtl;
  }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1E6F5C; padding-bottom: 18px; margin-bottom: 22px; }
  .head h1 { font-size: 22px; margin: 0 0 4px; color: #1E6F5C; }
  .head p { margin: 0; font-size: 12.5px; color: #5B6B66; }
  .ref { text-align: left; font-size: 12px; color: #5B6B66; direction: ltr; }
  .ref .id { font-size: 15px; font-weight: 800; color: #152420; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 22px; }
  .meta .box { background: #F6F8F7; border-radius: 12px; padding: 14px 16px; }
  .meta .box .label { font-size: 11px; color: #5B6B66; font-weight: 700; margin-bottom: 4px; }
  .meta .box .value { font-size: 13.5px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  thead th { text-align: right; font-size: 11.5px; color: #5B6B66; text-transform: uppercase; letter-spacing: .04em; padding: 8px 10px; border-bottom: 2px solid #DDE6E1; }
  thead th.num, tbody td.num { text-align: left; }
  tbody td { padding: 10px; font-size: 13px; border-bottom: 1px solid #EEF3F0; }
  td.name { font-weight: 700; }
  .opts { font-size: 11px; color: #5B6B66; font-weight: 400; margin-top: 2px; }
  .totals { margin-right: auto; width: 260px; }
  .totals .row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; color: #5B6B66; }
  .totals .row.total { color: #152420; font-weight: 800; font-size: 16px; border-top: 2px solid #1E6F5C; margin-top: 6px; padding-top: 10px; }
  .totals .row.total .val { color: #1E6F5C; }
  .footer { margin-top: 34px; text-align: center; font-size: 11.5px; color: #8A9994; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <h1>${escapeHtml(merchant.name)}</h1>
      <p>إيصال طلب — Order Receipt</p>
    </div>
    <div class="ref">
      <div class="id">#${cart.id.slice(0, 8).toUpperCase()}</div>
      <div>${new Date(cart.created_at).toLocaleString('ar-DZ')}</div>
    </div>
  </div>

  <div class="meta">
    <div class="box">
      <div class="label">العميل</div>
      <div class="value">${escapeHtml(cart.customer_name ?? '—')}</div>
      <div class="value" style="direction:ltr;text-align:right;">${escapeHtml(cart.customer_phone ?? '—')}</div>
    </div>
    <div class="box">
      <div class="label">التوصيل</div>
      <div class="value">${escapeHtml(cart.customer_city ?? '—')}</div>
      <div class="value">${escapeHtml(cart.customer_address ?? '—')}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>المنتج</th><th class="num">الكمية</th><th class="num">السعر</th><th class="num">الإجمالي</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>المجموع الفرعي</span><span>${Number(cart.subtotal).toLocaleString('ar-DZ')} ${cart.currency}</span></div>
    <div class="row"><span>رسوم التوصيل</span><span>${Number(cart.shipping_fee).toLocaleString('ar-DZ')} ${cart.currency}</span></div>
    <div class="row total"><span>الإجمالي</span><span class="val">${Number(cart.total).toLocaleString('ar-DZ')} ${cart.currency}</span></div>
  </div>

  <div class="meta" style="grid-template-columns: 1fr;">
    <div class="box">
      <div class="label">طريقة الدفع</div>
      <div class="value">${PAYMENT_LABEL_AR[cart.payment_method]}</div>
    </div>
  </div>

  <div class="footer">شكراً لثقتكم بنا — ${escapeHtml(merchant.name)}</div>
</body>
</html>`;
}
