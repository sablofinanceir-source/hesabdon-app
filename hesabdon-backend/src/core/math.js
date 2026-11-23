export const round = (n, d = 3) => {
  const f = 10 ** d;
  return Math.round((n + Number.EPSILON) * f) / f;
};
