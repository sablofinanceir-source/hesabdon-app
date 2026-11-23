import { normalizeText } from './text.js';

/**
 * پیدا کردن نزدیک‌ترین مورد از یک لیست بر اساس نام (برای تطبیق خروجی هوش مصنوعی).
 * هر آیتم باید فیلد name داشته باشد. اگر امتیاز کافی نباشد null برمی‌گرداند.
 */
export function fuzzyFind(name, list, threshold = 0.6) {
  const n = normalizeText(name);
  if (!n) return null;
  const nt = new Set(n.split(' '));
  let best = null;
  let bestScore = 0;
  for (const item of list) {
    const pn = item._norm ?? normalizeText(item.name);
    let score = 0;
    if (pn === n) score = 1;
    else if (pn.includes(n) || n.includes(pn)) score = 0.85;
    else {
      const pt = new Set(pn.split(' '));
      const inter = [...nt].filter((t) => pt.has(t)).length;
      score = inter / new Set([...nt, ...pt]).size;
    }
    if (score > bestScore) { best = item; bestScore = score; }
  }
  return bestScore >= threshold ? best : null;
}
