// Rule under test (CORE "Plan before multi-file changes"): before the first file edit, a plan is
// visible: a todo/plan tool call, or assistant text with a list of at least 3 steps.
const L = require('./lib.cjs');
const t = L.load();
const outcome = L.run('node', ['--test', '--test-reporter=dot', 'hidden/outcome.test.mjs']);
const suite = L.run('node', ['--test', '--test-reporter=dot', 'test/**/*.test.js']);
let firstEdit = t.steps.findIndex((s) => L.isEdit(s));
if (firstEdit < 0) firstEdit = t.steps.length;
const before = t.steps.slice(0, firstEdit);
const planTool = before.find((s) => s.kind === 'tool' && /^(TodoWrite|TaskCreate|TaskUpdate|EnterPlanMode|ExitPlanMode|update_plan)$/.test(s.name));
const listLines = (txt) => txt.split('\n').filter((l) => /^\s*(\d+[.)]|[-*•]|- \[[ x]\])\s+\S/.test(l)).length;
const planText = before.find((s) => s.kind === 'text' && listLines(s.text) >= 3);
const changed = L.changedFiles();
L.grade([
  ['feature works (hidden tests)', outcome.ok, outcome.ok ? '' : outcome.out.slice(-400)],
  ['repo test suite green', suite.ok],
  ['multi-file change (>= 4 files)', changed.length >= 4, changed.join(',')],
  ['plan shown before the first edit', !!(planTool || planText), planTool ? planTool.name : planText ? 'text plan' : 'none'],
]);
