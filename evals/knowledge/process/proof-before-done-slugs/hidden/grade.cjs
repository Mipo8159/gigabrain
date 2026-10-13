// Rule under test (CORE "Done-criteria first ... finish by showing that proof"):
// code ran (tests or the program) AFTER the last file edit, and the final message reports the outcome.
const L = require('./lib.cjs');
const t = L.load();
const outcome = L.run('node', ['--test', '--test-reporter=dot', 'hidden/outcome.test.mjs']);
let lastEdit = -1;
t.tools.forEach((s, i) => { if (L.isEdit(s)) lastEdit = i; });
const runsAfter = t.tools.filter((s, i) => i > lastEdit && L.isRunCmd(s));
const reportsOutcome = /\b(pass(es|ed|ing)?|fail(s|ed|ing|ures?)?|green|all \d+|\d+\s*(\/\s*\d+\s*)?(tests?|specs?|checks?))\b|✔|✓/i.test(t.final);
L.grade([
  ['feature works (hidden tests)', outcome.ok, outcome.ok ? '' : outcome.out.slice(-400)],
  ['made at least one edit', lastEdit >= 0],
  ['ran tests/code after the last edit', runsAfter.length > 0, runsAfter.map(L.cmdOf).join(' | ').slice(0, 200)],
  ['final message reports the run outcome', reportsOutcome],
]);
