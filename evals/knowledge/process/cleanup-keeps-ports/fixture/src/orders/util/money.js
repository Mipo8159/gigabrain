export const roundCents = (n) => Math.round(n);
export function formatCents(c) {
  return (c / 100).toFixed(2);
}
// export function parseMoney(s) { return Math.round(parseFloat(s) * 100); }
