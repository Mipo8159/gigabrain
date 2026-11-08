# How an LLM works, to the core (slug: ai-llm)

Researched 2026-11-06 by the `researcher` agent. [LIVE] = fetched that day. [REF] = well-known
paper or explainer cited by id, not re-fetched. Claude's internal architecture is undisclosed:
architectural claims are about the generic decoder-only transformer, not "Claude".
Lesson 1 of the AI-engineering series (0 `ai-map`, 1 `ai-llm`, 2 `ai-context`, 3 agents,
4 retrieval, 5 evals, 6 workflow).

## Mental model
1. An LLM is a function: token sequence → probability distribution over the next token. Chat,
   code and tools are loops around it. [REF Vaswani 2017 arXiv 1706.03762; Karpathy "Let's build GPT"]
2. It never sees characters or words: a fixed tokenizer cuts text into subword tokens and the
   model sees integer ids. [LIVE Anthropic token-counting; REF Sennrich 2015 arXiv 1508.07909]
3. Each id selects a row of a learned embedding table (a lookup, not a computation). Similar
   usage → nearby vectors. [REF Alammar; 3Blue1Brown ch.5]
4. A stack of identical blocks (attention + MLP, each with residual + norm) rewrites one vector
   per position: the residual stream. [REF Vaswani; Anthropic "Mathematical Framework" 2021]
5. Attention: each position's query (Q) is compared with earlier keys (K); softmax weights mix
   their values (V). A causal mask blocks later positions. [REF Vaswani eq. 1]
6. The last position's vector → one logit per vocabulary item → softmax → sample one token.
7. Generation is a loop: append, run again, stop at an end token or limit. Input is parallel
   (prefill), output is serial (decode). [REF Pope 2022 arXiv 2211.05102]
8. Pretraining minimises next-token cross-entropy; post-training (SFT, RLHF/RLAIF, RL with
   verifiable rewards) turns a text continuer into an assistant. [REF InstructGPT 2203.02155;
   Constitutional AI 2212.08073; Tulu 3 2411.15124; DeepSeek-R1 2501.12948]
9. Stateless: each API call carries the whole conversation. [LIVE context-windows]
10. A bigger window is not used uniformly: accuracy and recall degrade as it fills ("context
    rot"). [LIVE context-windows; LIVE Chroma 2025-07-14, 18 LLMs; REF Liu 2023 2307.03172]
11. Hallucination is structural: probability matching plus evals that reward guessing.
    [LIVE arXiv 2509.04664; LIVE Anthropic "Tracing the thoughts" 2025-03-27]
12. Capability scales smoothly with parameters, data and compute. [REF Kaplan 2001.08361;
    Chinchilla 2203.15556, ~20 tokens per parameter]

## Worked numbers (lesson figures use exactly these)
- **BPE**: corpus hug×10, pug×5, pun×12, bun×4, hugs×5. Round 1 top pair (u,g)=20 → `ug`;
  round 2 (u,n)=16 → `un`; round 3 (h,ug)=15 → `hug`; "hugs" = [hug, s]. Byte-level BPE in
  production → no unknown tokens. "strawberry" ≈ a few opaque ids, so letters are not in the input.
- **Tokens ≠ words**: OpenAI rule of thumb ~4 chars / ¾ word (English). Anthropic's current
  tokenizer (Opus 4.7+): 1M tokens ≈ 555k words ≈ 2.5M chars; ~30% more tokens than earlier
  Claude tokenizers for the same text. Count with `count_tokens` (free). [LIVE]
- **Cosine**: a=[1,2], b=[2,1]: a·b=4, |a|=|b|=√5 → cos=0.8.
- **Attention** (d_k=64, √=8): raw scores [16,8,0] → scaled [2,1,0] → exp [7.389,2.718,1.000],
  sum 11.107 → weights [0.665,0.245,0.090]. Output = 0.665·v1+0.245·v2+0.090·v3. √d_k keeps
  softmax from saturating. Causal mask: −∞ before softmax → weight exactly 0.
- **Multi-head**: e.g. 8 heads × 64 = 512. MLP hidden ≈ 4× d_model; most parameters live there.
  Pre-norm residual: x = x + Attn(Norm(x)); x = x + MLP(Norm(x)). RoPE rotates Q,K by position
  (whether Claude uses it: undisclosed).
- **Sampling**, logits [the 2.0, a 1.0, cat 0.5, dog 0.0, ran −1.0]:
  T=1 → [0.563,0.207,0.126,0.076,0.028]; T=0.5 → [0.829,0.112,0.041,0.015,0.002];
  T=2 → [0.375,0.227,0.177,0.138,0.084]; top-k=2 → [0.731,0.269];
  top-p=0.9 → cumulative 0.563,0.770,0.896,0.972 → keeps 4, drops "ran". [REF Holtzman 1904.09751]
- **KV cache**: stores K,V per layer per past token; decode computes only the new token.
  Illustrative Llama-like config (NOT Claude): 2×32 layers×8 KV heads×128×2 B = 128 KiB/token,
  ~12.5 GiB at 100k tokens. Prefill compute-bound, decode memory-bandwidth-bound; that this
  causes the output price premium is the standard account, not an Anthropic statement.
- **Loss**: −ln p. p=0.7 → 0.357; p=0.1 → 2.303; p=0.01 → 4.605; uniform over 50k vocab →
  ln 50000 = 10.82. Perplexity = e^loss (0.357 → 1.43).
- **Gradient descent**: θ ← θ − lr·∂L/∂θ, over batches (Karpathy micrograd).

## Current facts [LIVE 2026-11-06, models overview + pricing]
| Model | id | context | max out | $ in/out per MTok |
|---|---|---|---|---|
| Fable 5.1 | claude-fable-5-1 | 1M | 128K | 10 / 50 |
| Opus 5.5 | claude-opus-5-5 | 1M | 128K | 4 / 20 |
| Sonnet 5.5 | claude-sonnet-5-5 | 1M | 128K | 2 / 10 |
| Haiku 5.5 | claude-haiku-5-5 | 1M | 128K | from 0.10 / 0.50 |
- Output is 5× input on every current model. Thinking tokens bill as output and count toward
  the window. Cache reads ≈ 5% of input on Sonnet 5.5 ($0.10/MTok). Knowledge cutoff Jun 2026.
- **Sampling knobs**: on Opus 4.7+, all 5.x and Fable/Mythos, a non-default `temperature`,
  `top_p` or `top_k` returns 400 on every request; with API version 2026-10-21 any value
  returns 400 on every model. Older models: restricted only while thinking is on. So: teach the
  knobs as general LLM mechanics (open-weight and other APIs); on current Claude, steer with
  prompts and `effort`. [LIVE thinking page, grepped]
- **Thinking**: adaptive thinking + `effort`; manual `budget_tokens` deprecated on 4.6, 400 on 4.7+.
  Default effort: Fable 5.1 high, Opus 5.5 medium, Sonnet 5.5 high, Haiku 5.5 medium.
- Input over the window → 400 "prompt is too long"; server-side compaction (beta) exists.

## Traps
1. "It remembers previous chats" → each request resends history; persistence is the app's job.
2. "Temperature 0 is deterministic" → floating-point reduction order and batching vary
   [REF Thinking Machines, Sep 2025, unverified]; on current Claude it can't be set at all.
3. "I can tune temperature/top_p on Claude" → 400 on current models; strip it from wrappers.
4. "It reads words/letters" → token ids; explains spelling failures and tokenizer drift.
5. "Bigger window = uses all of it equally" → context rot; position matters.
6. "It looks things up" → weights compress training statistics; retrieval only via tools/RAG.
7. "Hallucination is a bug that gets patched" → structural; mitigate with grounding and
   permission to say "I don't know".
8. "Input and output cost the same" → output 5×; thinking bills as output.
9. "Its explanation is how it got the answer" → interpretability: described schoolbook carrying
   while using parallel approximate + last-digit paths (Claude 3.5 Haiku-era research).
10. "It learns from my chat mid-session" → weights frozen at inference; in-context learning is
    conditioning on the window.
11. "1 token = 1 word / 4 chars" → varies by language, content and model.

## Toy build (lab `toy-llm`, Karpathy makemore / minbpe as references)
char tokenizer → BPE on bytes (fixture: merges ug, un, hug) → bigram counts with add-1 →
mean NLL (uniform = ln V; p=0.7 → 0.3567) → softmax(T), seeded sampler, top-k, top-p,
generate (fixtures = the sampling numbers above). Done when all tests pass and generated
names look name-like.

## Sources
LIVE: platform.claude.com/docs/en/models/overview · /build-with-claude/context-windows ·
/build-with-claude/thinking · /build-with-claude/extended-thinking · /build-with-claude/token-counting ·
/about-claude/pricing · trychroma.com/research/context-rot · arxiv.org/abs/2509.04664 ·
anthropic.com/research/tracing-thoughts-language-model.
REF: arXiv 1706.03762, 1508.07909, 2104.09864, 2307.03172, 2001.08361, 2203.15556, 2203.02155,
1706.03741, 2212.08073, 2309.00267, 2411.15124, 2501.12948, 1904.09751, 2211.05102;
jalammar.github.io/illustrated-transformer; 3Blue1Brown Deep Learning ch. 5–7;
github.com/karpathy/makemore, /minbpe, /micrograd.
