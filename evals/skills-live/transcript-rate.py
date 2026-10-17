#!/usr/bin/env python3
"""Skill trigger rate in real transcripts (last 30 days): Skill tool calls split by
the turn they ran in (typed prompt vs slash command), plus keyword-matched
opportunities per skill and whether that turn loaded the skill.

    python3 evals/skills-live/transcript-rate.py [--show]   # --show prints matched prompts (110 chars)

The keyword RULES only shortlist candidates; NOTES.md has the hand labels.
"""
import json, pathlib, re, sys, collections, datetime
PROJ = pathlib.Path.home()/'.claude/projects'
since = (datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(days=30)).isoformat()
SHOW = '--show' in sys.argv

def prompt_text(r):
    if r.get("type") != "user" or r.get("isMeta") or r.get("isSidechain") or r.get("isCompactSummary"):
        return None
    c = r.get("message", {}).get("content")
    if isinstance(c, str): return c
    if isinstance(c, list) and c and c[0].get("type") == "text": return c[0].get("text", "")
    return None

RULES = {  # skill -> regex on typed prompt (lowercased)
 'debug-protocol': r"not working|doesn'?t work|isn'?t working|broken|still fail|fails?\b|failing|error|traceback|stack trace|exception|bug\b|fix (this|it)|why (is|does|did)|crash|wrong|regress|worked yesterday",
 'retro': r"that'?s it for today|done for (today|now)|good session|calling it|wrap(ping)? up|good night|signing off|^(ok |okay )?(thanks|thank you)[,! .]*(bye|that'?s all)|end (the|this) session|let'?s stop here|session (is )?over",
 'onboard-project': r"set (this|the) (project|repo) up|onboard|write a claude\.md|no claude\.md|set it up the way",
 'curate': r"\bcurate|process the inbox|inbox candidates|clean up the brain",
 'build-loop': r"until it works|don'?t keep asking|just get it done|\bloop\b|end to end|babysit",
 'tutor': r"teach me|i want to write it myself|learning mode|guide me|i'?ll write",
 'intent-review': r"does (this|it|the) (commit|pr|change|diff).*(match|deliver)|against the (ticket|requirement|spec)|requirements? doc|audit (this|the) repo",
 'teach': r"explain .* to the core|how does .* really work|make a lesson|teach me",
 'learn': r"what can i learn|give me an exam|what should i study|open the .* lesson",
}
out = collections.Counter(); per = collections.Counter(); match = collections.defaultdict(lambda: [0,0,0]); rows=[]
skillcalls=[]
files=[f for d in PROJ.iterdir() if d.is_dir() and not d.name.startswith(('-private-','-var-folders-','-tmp-')) for f in d.glob('*.jsonl')]
for f in files:
    recs=[]
    for l in f.open(errors='replace'):
        try: recs.append(json.loads(l))
        except ValueError: pass
    if not recs or max((r.get('timestamp') or '') for r in recs) < since: continue
    out['sessions']+=1
    # build turns: each typed prompt / command opens a turn; collect Skill calls until next one
    turn=None
    turns=[]
    for r in recs:
        p=prompt_text(r)
        if p is not None:
            if '<command-name>' in p[:300]:
                name=p.split('<command-name>',1)[1].split('</command-name>',1)[0]
                turn={'kind':'cmd','name':name,'text':'','skills':[]}; turns.append(turn); out['slash_commands']+=1
                if name.lstrip('/') in RULES or True: per['cmd:'+name]+=1
            elif not p.startswith(('<','[Request interrupted')):
                turn={'kind':'prompt','text':p,'skills':[]}; turns.append(turn); out['typed_prompts']+=1
            continue
        if r.get('type')=='assistant':
            for b in (r.get('message',{}).get('content') or []):
                if isinstance(b,dict) and b.get('type')=='tool_use' and b.get('name')=='Skill':
                    sk=(b.get('input') or {}).get('skill','?')
                    if r.get('isSidechain'): out['skill_calls_sidechain']+=1; continue
                    kind = turn['kind'] if turn else 'none'
                    out[f'skill_calls_in_{kind}_turn']+=1
                    skillcalls.append((f.name[:8],kind,sk, (turn or {}).get('name','')))
                    if turn: turn['skills'].append(sk)
    for t in turns:
        if t['kind']!='prompt': continue
        low=t['text'].lower()[:2000]
        for sk,rx in RULES.items():
            if re.search(rx, low):
                hit = any(s.split(':')[-1]==sk for s in t['skills'])
                anyskill = bool(t['skills'])
                match[sk][0]+=1; match[sk][1]+=hit; match[sk][2]+=anyskill
                rows.append((sk, hit, f.name[:8], re.sub(r'\s+',' ',t['text'])[:110]))
print(dict(out))
print('commands:', {k:v for k,v in per.most_common()})
print('skill calls (session,turnkind,skill,cmd):'); [print(' ',s) for s in skillcalls]
print('matches: skill matched hit anyskill'); [print(f'  {k:16} {v}') for k,v in match.items()]
if SHOW:
    for r in rows: print(r)
