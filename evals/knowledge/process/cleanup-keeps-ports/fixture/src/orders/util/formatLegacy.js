// Old receipt format from the v1 kiosk. Kept "just in case".
export function formatOrderLegacy(order) {
  let s = 'ORDER ' + order.id + '\n';
  for (var i = 0; i < order.lines.length; i++) {
    s = s + order.lines[i].qty + 'x ' + order.lines[i].sku + '\n';
  }
  return s + 'TOTAL ' + order.total;
}
