# Teach kit v2: markup contract

The lesson source is one HTML file with two markers: `<!-- teach-kit:css -->` at the end of `<head>`
and `<!-- teach-kit:js -->` at the end of `<body>`. The page's own sim functions go in a `<script>`
**before** the js marker. `bin/learn assemble <topic> <src>` inlines `kit.css` and `kit.js` and writes the
cached page. `bin/check-lesson` checks every item below. `example.html` is a small lesson that passes;
copy its parts, not its outline.

Tokens and figure style come from skill `visual-explainer` (Paper register by default for lessons).
Fonts may come from Google Fonts with a local fallback stack. Nothing else may be loaded from the network.

| Component | Markup | The kit does |
|---|---|---|
| Topic id | `<meta name="teach-topic" content="kafka">` | keys saved answers |
| Progress bar | `<div data-progress></div>` | fills as you scroll |
| Section map | `<nav data-toc></nav>` | lists `main section[id] > h2` (`h2[data-short]` = short label), marks where you are |
| Hook | `<section data-hook>` with `<p class="hook-q">` + a figure | (style) the question and the picture of the problem |
| Before you start | `<section data-prereq>`: what you need, what you'll be able to do, time | (style) |
| Review box | `<div data-review></div>` near the top and in the recall section | lists questions due for review (1, 3, 7, 21, 60 days) |
| Glossary term | `<dfn data-tip="One plain sentence.">offset</dfn>` | tooltip on hover, focus and tap |
| Glossary list | `<div data-glossary></div>` | lists every term |
| Stepper | `<figure data-stepper [data-start="1"] [data-code="id"]>` with parts `data-s="N"` (shown from step N) or `data-only="N"` (only at step N, or a list: `"1 3"`, `"2,4-5"`); `.kit-player` holding `button[data-step=prev]`, `button[data-play]` (optional), `input[type=range]` (optional), `span[data-step-count]`, `button[data-step=next]`; `ol.ve-cap > li` one per step, `li[data-lines="3-5"]` (or `"3,5,7-9"`) lights those `.line` spans in `pre#id` | Back/Next, ←/→ keys, scrub, play, captions, code in sync |
| Quiz | `<div data-quiz id="q-…">` → `.kicker` → `p[data-ask]` → `.options` of `button[data-option]` (exactly one `data-correct`, every wrong one `data-why="why this is tempting and wrong"`) → `div[data-feedback]` (the explanation, 20+ chars) | marks right/wrong, shows the option's why plus the explanation, schedules review |
| Predict | a quiz with `data-predict`, plus `[data-reveal]` (a figure or stepper with the real outcome) inside it | hides the outcome until a guess |
| Live figure | `<figure data-sim="name">` with `input[data-param="x"]` controls, `[data-show="x"]` value labels, `[data-out="k"]` outputs, an SVG; `window.teachSims.name = (p, root) => { …redraw…; return {k: 'text'} }` | runs it on load and on every input |
| Put in order | `<div data-order>` → `ol > li[data-pos="N"]` (shuffled) → `button[data-check]` → `div[data-feedback]` | ↑/↓ buttons, marks wrong positions |
| Fill the gap | `<div data-fill>` with `select[data-answer="value"]` inside a `pre` or sentence → `button[data-check]` → `div[data-feedback]` | marks wrong gaps |
| Recall | `<section data-recall id="recall">` holding 3+ quizzes that mix questions from the whole lesson, and a `data-review` box | |
| Linked terms | `data-ref="key"` on a prose term and on SVG parts | hover/focus lights both |

Rules the checker enforces: no console errors (also with `localStorage` blocked); no network
requests except Google Fonts; 6+ `<figure>` with SVG, each with a `<figcaption>` and the SVG with
`role="img"` + `aria-label`; 2+ steppers whose Next changes the figure and Back undoes it; 1+ live
figure whose input changes it; 8+ quizzes (2+ predicts, each with a `[data-reveal]`) that react, each
with an `id`, exactly one correct option, a `data-why` on every wrong one, its own 20+ character
explanation, and feedback and reveals hidden until answered; a recall section with 3+ quizzes; 1+ order or fill exercise
that reacts; 6+ glossary terms; a hook and a prereq section; a filled section map; no horizontal
scroll at 390 px in light and dark; every SVG label in a figure renders at 10.5 px or more at 390 px
(the kit gives `.frame > svg` a 40rem minimum and a sideways scroll on phones; `svg.fit` opts out);
under 1.5 MB.
