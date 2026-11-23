import { toLatinDigits } from './phone.js';

// یکسان‌سازی متن فارسی برای جستجو و تطبیق (ی/ک عربی، نیم‌فاصله، ارقام)
export const normalizeText = (s = '') =>
  toLatinDigits(s)
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
