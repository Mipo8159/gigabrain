# Exams: data contract (teach kit)

Each topic has five exam variants: `evals/knowledge/<topic>/exams/v1.json` … `v5.json`. They are sources (data),
so they live in the repo. `bin/learn serve` renders them with `exam.html` and appends every finished attempt to
`me/exam-log.jsonl`. `bin/check-exam` enforces everything below; a variant that fails it does not ship.

## Purpose
Exams test **structure and approach at scale**: which design, which trade-off, what fails first, what to change.
Giga reads code fluently, so a short snippet (≤ 25 lines, in `code`) is welcome when the question is about what
the code *does to the system* (ordering, retries, locks, fan-out), not about syntax or API trivia.

## Shape
```json
{
  "topic": "kafka", "variant": 1, "of": 5,
  "title": "Kafka at scale — variant 1",
  "description": "One sentence: what this variant leans on.",
  "minutes": 30, "pass": 0.7, "scaled": false,
  "domains": [{"id": "ordering", "name": "Ordering and partitioning", "weight": 0.25}],
  "questions": [{
    "id": "kafka-v1-q01", "domain": "ordering",
    "stem": "Scenario in 2–6 sentences. `inline code` and **bold** allowed. Ends with the question.",
    "code": "optional snippet, plain text",
    "options": [
      {"text": "…", "correct": true,  "why": "Why this is right, 1–2 sentences."},
      {"text": "…", "correct": false, "why": "Why it is tempting, and why it is wrong here."}
    ],
    "explain": "The principle behind the answer, 2–5 sentences; what to remember.",
    "refs": ["https://official-docs/…"]
  }]
}
```

## Rules (checked)
- **Counts.** Topic exams: 20 questions, `minutes` 30, `pass` 0.7, `scaled` false. `aws-associate`: 65 questions,
  `minutes` 130, `pass` 0.72, `scaled` true, the four SAA-C03 domains (`secure` .30, `resilient` .26,
  `performance` .24, `cost` .20), per-domain counts within ±2 of 65 × weight.
- **Domains.** 3–6 per topic exam, weights sum to 1; every question's `domain` is one of them; each domain has 2+ questions.
- **Single answer:** exactly 4 options, 1 correct. **Multiple response:** 5–6 options, 2–3 correct, and the stem
  ends with "(Choose two.)" or "(Choose three.)" matching the count. Topic exams: 0–4 multi; AWS: 6–12 per variant.
- **Every option has a `why`** (20+ characters). `explain` is 60+ characters. `refs`: 1+ for aws-associate.
- No "all of the above", "none of the above", "both A and B". Options don't refer to letters (the runner shuffles).
- **No giveaways:** in a variant the correct option is the longest one in at most 40% of single-answer questions.
- **No repeats:** ids unique; no stem shared (or near-identical) with another question in any variant of the topic.
- **Scenarios, not recall:** at most 20% of stems may be definition questions ("What is…", "Which service is…").
- Facts come from the topic's `BRIEF.md` / `EXAM.md` and official docs. If unsure, drop the question.
