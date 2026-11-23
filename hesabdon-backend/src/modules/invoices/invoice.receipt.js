// خروجی HTML رسید؛ مناسب چاپ و اشتراک‌گذاری (در اپ موبایل با expo-print به PDF هم تبدیل می‌شود)
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => new Intl.NumberFormat('fa-IR').format(n ?? 0);
const dateFa = (d) =>
  new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(new Date(d));

export function renderReceiptHtml({ shop, invoice }) {
  const unit = shop.currency === 'IRR' ? 'ریال' : 'تومان';
  const title = invoice.type === 'sale' ? 'رسید فروش' : 'رسید خرید';
  const remaining = Math.max(0, invoice.total - invoice.paidAmount);

  const rows = invoice.items
    .map((i) => `<tr><td>${esc(i.name)}</td><td>${num(i.quantity)} ${esc(i.unit)}</td><td>${num(i.unitPrice)}</td><td>${num(i.total)}</td></tr>`)
    .join('');

  return `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body{font-family:Vazirmatn,Tahoma,sans-serif;max-width:380px;margin:0 auto;padding:16px;color:#111;font-size:13px}
  h1{font-size:18px;text-align:center;margin:0}.c{text-align:center;color:#555;margin:2px 0}
  table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:6px 4px;border-bottom:1px dashed #bbb;text-align:right}
  .sum div{display:flex;justify-content:space-between;padding:3px 0}.sum .t{font-weight:700;font-size:15px;border-top:1px solid #000;margin-top:4px;padding-top:6px}
  .f{text-align:center;color:#666;margin-top:14px}
</style></head><body>
  <h1>${esc(shop.name)}</h1>
  ${shop.phone ? `<p class="c">${esc(shop.phone)}</p>` : ''}${shop.address ? `<p class="c">${esc(shop.address)}</p>` : ''}
  <p class="c">${title} شماره ${num(invoice.number)} — ${dateFa(invoice.date)}</p>
  ${invoice.party?.name ? `<p class="c">طرف حساب: ${esc(invoice.party.name)}</p>` : ''}
  <table><thead><tr><th>کالا</th><th>تعداد</th><th>فی</th><th>مبلغ</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="sum">
    <div><span>جمع کالاها</span><span>${num(invoice.subtotal)}</span></div>
    ${invoice.discount ? `<div><span>تخفیف</span><span>${num(invoice.discount)}</span></div>` : ''}
    <div class="t"><span>مبلغ نهایی (${unit})</span><span>${num(invoice.total)}</span></div>
    <div><span>پرداخت‌شده</span><span>${num(invoice.paidAmount)}</span></div>
    ${remaining ? `<div><span>باقی‌مانده (نسیه)</span><span>${num(remaining)}</span></div>` : ''}
  </div>
  ${shop.footer ? `<p class="f">${esc(shop.footer)}</p>` : ''}
</body></html>`;
}
