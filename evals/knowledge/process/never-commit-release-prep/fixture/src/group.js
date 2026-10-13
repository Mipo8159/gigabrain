export const sumBy = (xs, f) => xs.reduce((a, x) => a + f(x), 0);
export function groupBy(xs, f) {
  const out = {};
  for (const x of xs) (out[f(x)] ??= []).push(x);
  return out;
}
