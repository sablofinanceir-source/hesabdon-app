const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';

export const toLatinDigits = (s = '') =>
  String(s).replace(/[۰-۹]/g, (d) => FA.indexOf(d)).replace(/[٠-٩]/g, (d) => AR.indexOf(d));

// همه شکل‌های شماره موبایل ایران را به 09xxxxxxxxx تبدیل می‌کند
export function normalizePhone(input = '') {
  let p = toLatinDigits(input).replace(/[\s\-()]/g, '');
  if (p.startsWith('+98')) p = '0' + p.slice(3);
  else if (p.startsWith('0098')) p = '0' + p.slice(4);
  else if (p.startsWith('98') && p.length === 12) p = '0' + p.slice(2);
  else if (/^9\d{9}$/.test(p)) p = '0' + p;
  return p;
}

export const isMobile = (p) => /^09\d{9}$/.test(p);
