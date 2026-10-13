// Shared transcript + workdir helpers for process graders.
// Canonical copy: evals/knowledge/process/_lib/lib.cjs. Each case's hidden/lib.cjs is an
// identical copy (hidden/ is copied alone into the run's workdir); _lib/selftest.sh checks they match.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execSync, spawnSync } = require('node:child_process');

const WD = process.cwd();

// Real runs set EVAL_TRANSCRIPT. --verify-fixtures does not: the solution overlay ships a
// `.eval-solution` marker, so it is graded with hidden/fixtures/good.jsonl; the bare fixture
// has no marker and gets an empty transcript.
function transcriptPath() {
  const p = process.env.EVAL_TRANSCRIPT;
  if (p && fs.existsSync(p)) return p;
  if (fs.existsSync(path.join(WD, '.eval-solution'))) return path.join(WD, 'hidden', 'fixtures', 'good.jsonl');
  return null;
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((c) => (typeof c === 'string' ? c : c.text || '')).join('\n');
  return '';
}

// Ordered steps: {kind:'text', text} | {kind:'tool', name, input, id, result, isError}
function load() {
  const p = transcriptPath();
  const steps = [];
  const byId = {};
  let finalFromResult = '';
  if (p) {
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      let ev;
      try { ev = JSON.parse(line); } catch { continue; }
      if (ev.type === 'assistant') {
        for (const c of ev.message?.content || []) {
          if (c.type === 'text') steps.push({ kind: 'text', text: c.text || '' });
          if (c.type === 'tool_use') {
            const s = { kind: 'tool', name: c.name, input: c.input || {}, id: c.id, result: '', isError: false };
            byId[c.id] = s;
            steps.push(s);
          }
        }
      } else if (ev.type === 'user') {
        const content = ev.message?.content;
        for (const c of Array.isArray(content) ? content : []) {
          if (c.type === 'tool_result' && byId[c.tool_use_id]) {
            byId[c.tool_use_id].result = textOf(c.content);
            byId[c.tool_use_id].isError = !!c.is_error;
          }
        }
      } else if (ev.type === 'result') {
        finalFromResult = ev.result || '';
      }
    }
  }
  let final = finalFromResult;
  const f = process.env.EVAL_FINAL;
  if (f && fs.existsSync(f) && process.env.EVAL_TRANSCRIPT && fs.existsSync(process.env.EVAL_TRANSCRIPT)) {
    final = fs.readFileSync(f, 'utf8');
  }
  if (!final) {  // no result event: fall back to the last assistant text
    const texts = steps.filter((s) => s.kind === 'text');
    final = texts.length ? texts[texts.length - 1].text : '';
  }
  return { path: p, steps, tools: steps.filter((s) => s.kind === 'tool'), final };
}

// Repo-relative path for a tool's file_path (absolute paths from the run's workdir).
function rel(p) {
  if (!p) return '';
  if (!path.isAbsolute(p)) return p.replace(/^\.\//, '');
  const r = path.relative(WD, p);
  if (!r.startsWith('..')) return r;
  const i = p.lastIndexOf('/work/');
  return i >= 0 ? p.slice(i + 6) : p;
}

const cmdOf = (s) => (s.name === 'Bash' ? String(s.input.command || '') : '');

// Files a step writes: Write/Edit/MultiEdit/NotebookEdit, or Bash redirection / tee / sed -i.
function editedFiles(s) {
  if (s.kind !== 'tool' || s.isError) return [];
  if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(s.name)) {
    return [rel(s.input.file_path || s.input.notebook_path)];
  }
  const c = cmdOf(s);
  if (!c) return [];
  const out = [];
  for (const m of c.matchAll(/(?:^|[^0-9&>])>{1,2}\s*([^\s&|;<>()]+)/g)) if (!/^\/dev\//.test(m[1])) out.push(rel(m[1]));
  for (const m of c.matchAll(/\btee\s+(?:-a\s+)?([^\s&|;]+)/g)) out.push(rel(m[1]));
  for (const m of c.matchAll(/\bsed\s+-i\S*\s+(?:''\s+)?(?:'[^']*'|"[^"]*"|\S+)\s+([^\s&|;]+)/g)) out.push(rel(m[1]));
  return out;
}
const isEdit = (s) => editedFiles(s).length > 0;

// Running code: tests, scripts, type checks. `node -v` and friends do not count.
function isRunCmd(s) {
  const c = cmdOf(s);
  if (!c) return false;
  return /\b(npm\s+(test|t|run|start|exec)\b|npx\s+\S+|node\s+(?!-v\b|--version\b)\S+|tsc\b|yarn\s+\w+|pnpm\s+\w+)/.test(c);
}

function sh(cmd) {
  try { return execSync(cmd, { cwd: WD, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return (e.stdout || '') + (e.stderr || ''); }
}
function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: WD, encoding: 'utf8', shell: false });
  return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || '') };
}

// Files changed vs the fixture commit, ignoring grader/test infrastructure.
function changedFiles() {
  const tracked = sh('git diff HEAD --name-only').split('\n');
  const untracked = sh('git ls-files --others --exclude-standard').split('\n');
  return [...new Set([...tracked, ...untracked])].filter((f) => f && !/^(hidden\/|node_modules\/|\.eval-solution$)/.test(f));
}

function grade(checks) {
  // checks: [[name, bool, detail?]]
  let ok = true;
  for (const [name, pass, detail] of checks) {
    ok = ok && !!pass;
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  }
  console.log(ok ? 'RESULT: pass' : 'RESULT: fail');
  process.exit(ok ? 0 : 1);
}

module.exports = { WD, load, rel, cmdOf, editedFiles, isEdit, isRunCmd, sh, run, changedFiles, grade };
