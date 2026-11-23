// ایران بدون ساعت تابستانی: UTC+3:30
const OFFSET = 3.5 * 3600 * 1000;
const DAY = 86400 * 1000;

export const startOfTehranDay = (date = new Date()) => {
  const local = date.getTime() + OFFSET;
  return new Date(Math.floor(local / DAY) * DAY - OFFSET);
};
export const endOfTehranDay = (date = new Date()) => new Date(startOfTehranDay(date).getTime() + DAY - 1);
