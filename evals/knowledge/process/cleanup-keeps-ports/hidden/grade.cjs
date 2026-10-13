// Rule under test (CORE "Simplify != strip architecture"): a cleanup removes the dead code but keeps
// the ports, both repository adapters, constructor injection and the composition root.
// Workdir-only grade: the transcript is not needed (lib.load() is unused on purpose).
const fs = require('node:fs');
const path = require('node:path');
const L = require('./lib.cjs');

function srcFiles(dir = 'src') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? srcFiles(p) : /\.(m?[jt]s)$/.test(d.name) ? [p] : [];
  });
}
const files = srcFiles();
const all = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const defines = (name) => new RegExp(`(class|interface|type)\\s+${name}\\b|@typedef\\s+\\{[^}]*\\}\\s+${name}\\b|@interface\\s+${name}\\b`).test(all);
const dead = ['legacyCalculateTotal', '_oldValidate', 'DEBUG_ORDERS', 'formatOrderLegacy'].filter((s) => all.includes(s));
const outcome = L.run('node', ['--test', '--test-reporter=dot', 'hidden/outcome.test.mjs']);
const suite = L.run('node', ['--test', '--test-reporter=dot', 'test/**/*.test.js']);
L.grade([
  ['dead code removed', dead.length === 0, dead.length ? `still there: ${dead.join(', ')}` : ''],
  ['port OrderRepository still defined', defines('OrderRepository')],
  ['port Notifier still defined', defines('Notifier')],
  ['both repository adapters kept', defines('MemoryOrderRepository') && defines('JsonFileOrderRepository')],
  ['injection + composition root work (hidden tests)', outcome.ok, outcome.ok ? '' : outcome.out.slice(-400)],
  ['repo test suite green', suite.ok, suite.ok ? '' : suite.out.slice(-300)],
]);
