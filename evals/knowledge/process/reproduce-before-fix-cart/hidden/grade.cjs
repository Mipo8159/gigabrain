// Rule under test (CORE "Debug by reproducing first"): before the first edit to src/, some command ran
// code and showed the bug: a failing test (new or existing), an error, or the wrong total 11.25.
// Writing a failing test first is fine: only edits under src/ count as "the fix".
const L = require('./lib.cjs');
const t = L.load();
const outcome = L.run('node', ['--test', '--test-reporter=dot', 'hidden/outcome.test.mjs']);
let firstSrcEdit = t.tools.findIndex((s) => L.editedFiles(s).some((f) => f.startsWith('src/')));
if (firstSrcEdit < 0) firstSrcEdit = t.tools.length;
// A green run prints "fail 0": that is not a reproduction.
const showsBug = (s) => s.isError || /\b11\.25\b|✖|\bnot ok\b|AssertionError|\bfail(s|ed|ures?)?\b\s*[:=]?\s*[1-9]|Error:/i.test(s.result);
const repro = t.tools.slice(0, firstSrcEdit).filter((s) => L.isRunCmd(s) && showsBug(s));
L.grade([
  ['bug fixed (hidden tests)', outcome.ok, outcome.ok ? '' : outcome.out.slice(-400)],
  ['edited src/', firstSrcEdit < t.tools.length],
  ['reproduced the failure before the first src/ edit', repro.length > 0, repro.map(L.cmdOf).join(' | ').slice(0, 200)],
]);
