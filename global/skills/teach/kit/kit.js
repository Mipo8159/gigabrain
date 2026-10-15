/* teach kit v2: the interactive layer of a lesson page (skill `teach`). Inlined by `bin/learn assemble`.
 * Plain JS, no dependencies, works on file:// and offline. Everything is driven by data attributes;
 * the markup contract lives in global/skills/teach/kit/CONTRACT.md. Without JS the page still reads:
 * steppers show their full picture, feedback stays hidden, reveals stay closed. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const pageKey = 'teach:' + (document.querySelector('meta[name=teach-topic]')?.content || location.pathname.split('/').pop());

  // ---- storage: never required. Private windows and blocked storage just mean no memory between visits.
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(pageKey) || '{}'); } catch { return {}; } },
    set(v) { try { localStorage.setItem(pageKey, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };
  const DAY = 864e5, BOXES = [1, 3, 7, 21, 60]; // Leitner-style spacing in days

  // ---- stepper: [data-stepper] with [data-s] parts, ol.ve-cap > li captions, prev/next/play/range controls.
  // Parts with data-s="N" are visible from step N. A caption li may carry data-lines="3-5" to light those lines
  // in the code block named by the stepper's data-code (lines are .line spans, numbered from 1).
  for (const root of $$('[data-stepper]')) {
    const parts = $$('[data-s], [data-only]', root), caps = $$('.ve-cap li', root);
    // data-only takes one step or a list: "2", "1 3", "2,4-5"
    const steps = (v) => { const out = new Set(); for (const t of String(v).split(/[\s,]+/)) { const [a, b] = t.split('-').map(Number); if (a) for (let x = a; x <= (b || a); x++) out.add(x); } return out; };
    for (const p of parts) if (p.dataset.only) p._only = steps(p.dataset.only);
    const n = Math.max(caps.length, ...parts.map((p) => +p.dataset.s || (p._only ? Math.max(...p._only) : 1)));
    const range = $('input[type=range]', root), play = $('[data-play]', root), count = $('[data-step-count]', root);
    const code = root.dataset.code ? document.getElementById(root.dataset.code) : null;
    const lines = code ? $$('.line', code) : [];
    let i = 0, timer = null;
    root.classList.add('ve-steps', 'js-stepper');
    if (!root.hasAttribute('tabindex')) root.tabIndex = 0;
    if (range) { range.min = 0; range.max = n - 1; range.setAttribute('aria-label', 'Step'); }
    const live = $('.ve-cap', root); live?.setAttribute('aria-live', 'polite');
    const show = (k) => {
      i = Math.max(0, Math.min(n - 1, k));
      // data-s="N": shown from step N on; data-only="N": shown at step N only
      for (const el of parts) {
        const on = el._only ? el._only.has(i + 1) : +el.dataset.s <= i + 1;
        el.classList.toggle('on', on); el.classList.toggle('now', el._only ? on : +el.dataset.s === i + 1);
      }
      caps.forEach((c, j) => { c.hidden = j !== i; c.dataset.n ||= `${j + 1} / ${caps.length}`; });
      const span = caps[i]?.dataset.lines;
      if (lines.length) {
        // "3", "3-5" or a list such as "3,5,7-9"
        const lit = new Set();
        for (const part of (span || '').split(',')) { const [a, b] = part.split('-').map(Number); if (a) for (let x = a; x <= (b || a); x++) lit.add(x); }
        lines.forEach((l, j) => l.classList.toggle('is-lit', lit.has(j + 1)));
      }
      root.classList.toggle('is-full', i === n - 1);
      root.dataset.at = i + 1;
      if (count) count.textContent = `${i + 1} / ${n}`;
      if (range) range.value = i;
      for (const b of $$('[data-step]', root)) {
        b.disabled = (b.dataset.step === 'prev' && i === 0) || (b.dataset.step === 'next' && i === n - 1);
      }
      root.dispatchEvent(new Event('ve:step'));
    };
    const stop = () => { clearInterval(timer); timer = null; if (play) { play.textContent = 'Play'; play.setAttribute('aria-pressed', 'false'); } };
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-step]');
      if (!b) return;
      stop();
      show(i + (b.dataset.step === 'prev' ? -1 : b.dataset.step === 'next' ? 1 : 0));
    });
    root.addEventListener('keydown', (e) => {
      if (e.target.matches('input, select, textarea')) return;
      if (e.key === 'ArrowRight') { stop(); show(i + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { stop(); show(i - 1); e.preventDefault(); }
    });
    range?.addEventListener('input', () => { stop(); show(+range.value); });
    play?.addEventListener('click', () => {
      if (timer) return stop();
      if (i === n - 1) show(0);
      play.textContent = 'Pause'; play.setAttribute('aria-pressed', 'true');
      timer = setInterval(() => (i < n - 1 ? show(i + 1) : stop()), +(root.dataset.every || 3200));
    });
    show((+root.dataset.start || 1) - 1);
  }

  // ---- quizzes: [data-quiz] > [data-option] (one with data-correct; wrong ones carry data-why) + [data-feedback].
  // [data-predict] quizzes also hold [data-reveal] content that opens only after a guess.
  const results = store.get();
  results.q ||= {};
  const quizzes = $$('[data-quiz]');
  quizzes.forEach((q, idx) => {
    q.id ||= 'q' + (idx + 1);
    const opts = $$('[data-option]', q), fb = $('[data-feedback]', q), reveal = $$('[data-reveal]', q);
    const explain = fb?.innerHTML || '';
    if (fb) { fb.hidden = true; fb.setAttribute('aria-live', 'polite'); }
    reveal.forEach((r) => (r.hidden = true));
    q.setAttribute('role', 'group');
    for (const o of opts) {
      o.type = 'button';
      o.addEventListener('click', () => {
        const right = o.hasAttribute('data-correct');
        for (const x of opts) {
          x.classList.toggle('is-picked', x === o);
          x.classList.toggle('is-right', x.hasAttribute('data-correct'));
          x.setAttribute('aria-pressed', String(x === o));
        }
        q.classList.add('is-answered');
        q.classList.toggle('is-wrong', !right);
        if (fb) {
          const why = !right && o.dataset.why ? `<p class="why">${o.dataset.why}</p>` : '';
          fb.innerHTML = `<p class="verdict">${right ? '● Right.' : '■ Not quite.'}</p>${why}${explain}`;
          fb.hidden = false;
        }
        reveal.forEach((r) => (r.hidden = false));
        // spaced review: first answer of this visit decides the box
        const now = Date.now(), prev = results.q[q.id] || { box: -1 };
        if (!q.dataset.scored) {
          q.dataset.scored = '1';
          // a right answer moves a question up only once it is due; re-reading the page early is not spacing
          const box = !right ? 0 : prev.box < 0 || prev.due <= now ? Math.min(prev.box + 1, BOXES.length - 1) : prev.box;
          results.q[q.id] = { box, right, at: now, due: now + BOXES[Math.max(box, 0)] * DAY };
          store.set(results);
          renderReview();
        }
      });
    }
  });

  // ---- spaced review: [data-review] shows what is due (top of page) and the schedule (end of page).
  function renderReview() {
    const now = Date.now(), seen = Object.entries(results.q || {}).filter(([id]) => document.getElementById(id)?.matches('[data-quiz]'));
    const due = seen.filter(([, r]) => r.due <= now).map(([id]) => id);
    for (const el of $$('[data-review]')) {
      if (!seen.length) { el.innerHTML = '<p>No answers saved yet. Answer the questions; this box then tells you when to come back and which ones to retry.</p>'; continue; }
      const wrong = seen.filter(([, r]) => !r.right).length;
      const next = Math.min(...seen.map(([, r]) => r.due));
      const links = due.map((id) => `<a href="#${id}">${esc((document.getElementById(id).querySelector('[data-ask]')?.textContent || id).trim().slice(0, 80))}</a>`).join('');
      el.innerHTML = due.length
        ? `<p><b>${due.length} question${due.length > 1 ? 's' : ''} due for review.</b> Answer them again before reading on:</p><div class="review-links">${links}</div>`
        : `<p>${seen.length} answered, ${wrong} to retry. Next review: <b>${new Date(next).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</b>.</p>`;
      el.insertAdjacentHTML('beforeend', '<button type="button" data-review-reset>Forget my answers</button>');
    }
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-review-reset]')) return;
    results.q = {}; store.set(results); renderReview();
  });
  renderReview();

  // ---- live figure: [data-sim="name"] with inputs carrying data-param; window.teachSims[name](params, root)
  // redraws and may return {key: text} for [data-out="key"] elements.
  const sims = (window.teachSims ||= {});
  for (const root of $$('[data-sim]')) {
    const fn = sims[root.dataset.sim];
    const inputs = $$('[data-param]', root);
    const run = () => {
      const p = {};
      for (const el of inputs) p[el.dataset.param] = el.type === 'checkbox' ? el.checked : el.type === 'range' || el.type === 'number' ? +el.value : el.value;
      for (const el of inputs) { const o = $(`[data-show="${el.dataset.param}"]`, root); if (o) o.textContent = el.value; }
      const out = typeof fn === 'function' ? fn(p, root) : null;
      if (out) for (const [k, v] of Object.entries(out)) for (const el of $$(`[data-out="${k}"]`, root)) el.textContent = v;
    };
    if (typeof fn !== 'function') console.error(`teach kit: no window.teachSims["${root.dataset.sim}"]`);
    for (const el of inputs) el.addEventListener('input', run);
    run();
  }

  // ---- put in order: [data-order] > ol > li[data-pos] (shuffled in markup) + [data-check] + [data-feedback].
  for (const root of $$('[data-order]')) {
    const list = $('ol, ul', root), fb = $('[data-feedback]', root), explain = fb?.innerHTML || '';
    if (fb) { fb.hidden = true; fb.setAttribute('aria-live', 'polite'); }
    for (const li of $$('li', list)) {
      const name = esc(li.textContent.trim().slice(0, 60));
      // one wrapping text box per item, so mixed text and <code> wrap instead of becoming flex pieces
      const body = document.createElement('span'); body.className = 'order-text';
      body.append(...li.childNodes); li.append(body);
      li.insertAdjacentHTML('beforeend', `<span class="order-btns"><button type="button" data-move="-1" aria-label="Move up: ${name}">↑</button><button type="button" data-move="1" aria-label="Move down: ${name}">↓</button></span>`);
    }
    root.addEventListener('click', (e) => {
      const m = e.target.closest('[data-move]');
      if (m) {
        const li = m.closest('li');
        if (+m.dataset.move < 0 && li.previousElementSibling) list.insertBefore(li, li.previousElementSibling);
        if (+m.dataset.move > 0 && li.nextElementSibling) list.insertBefore(li.nextElementSibling, li);
        m.focus();
        return;
      }
      if (!e.target.closest('[data-check]')) return;
      const items = $$('li', list);
      const ok = items.every((li, j) => +li.dataset.pos === j + 1);
      items.forEach((li, j) => li.classList.toggle('is-off', +li.dataset.pos !== j + 1));
      if (fb) { fb.innerHTML = `<p class="verdict">${ok ? '● Right order.' : `■ ${items.filter((li, j) => +li.dataset.pos !== j + 1).length} out of place (marked).`}</p>${ok ? explain : ''}`; fb.hidden = false; }
    });
  }

  // ---- fill the gap: [data-fill] with select[data-answer] inside code or prose + [data-check] + [data-feedback].
  for (const root of $$('[data-fill]')) {
    const fb = $('[data-feedback]', root), explain = fb?.innerHTML || '';
    if (fb) { fb.hidden = true; fb.setAttribute('aria-live', 'polite'); }
    root.addEventListener('click', (e) => {
      if (!e.target.closest('[data-check]')) return;
      const sels = $$('select[data-answer]', root);
      const bad = sels.filter((s) => s.value !== s.dataset.answer);
      sels.forEach((s) => s.classList.toggle('is-off', s.value !== s.dataset.answer));
      if (fb) { fb.innerHTML = `<p class="verdict">${bad.length ? `■ ${bad.length} of ${sels.length} gaps wrong (marked).` : '● All gaps right.'}</p>${bad.length ? '' : explain}`; fb.hidden = false; }
    });
  }

  // ---- glossary: <dfn data-tip="…">term</dfn>. Tooltip is position:fixed on body, so no container clips it.
  // [data-glossary] (optional) lists every term with its definition.
  const tip = document.createElement('div');
  tip.className = 'kit-tip'; tip.id = 'kit-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  let shownAt = 0;
  const hide = () => { tip.hidden = true; };
  document.body.append(tip);
  const terms = $$('[data-tip]');
  const place = (t) => {
    tip.textContent = t.dataset.tip; tip.hidden = false; shownAt = Date.now();
    const r = t.getBoundingClientRect(), w = Math.min(320, innerWidth - 32);
    tip.style.maxWidth = w + 'px';
    const left = Math.max(16, Math.min(r.left, innerWidth - w - 16));
    const below = r.bottom + 8 + tip.offsetHeight < innerHeight;
    tip.style.left = left + 'px';
    tip.style.top = (below ? r.bottom + 8 : r.top - tip.offsetHeight - 8) + 'px';
  };
  for (const t of terms) {
    t.tabIndex = 0;
    t.addEventListener('pointerenter', () => place(t));
    t.setAttribute('aria-describedby', 'kit-tip');
    t.addEventListener('pointerleave', hide);
    t.addEventListener('focus', () => requestAnimationFrame(() => place(t))); // after focus scrolls it into view
    t.addEventListener('blur', hide);
    t.addEventListener('click', (e) => { e.stopPropagation(); tip.hidden && place(t); });
  }
  document.addEventListener('click', hide);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  addEventListener('scroll', () => { if (Date.now() - shownAt > 150) hide(); }, { passive: true });
  const gl = $('[data-glossary]');
  if (gl) {
    const seen = new Map();
    for (const t of terms) { const k = t.textContent.trim().toLowerCase(); if (!seen.has(k)) seen.set(k, [t.textContent.trim(), t.dataset.tip]); }
    gl.innerHTML = '<dl>' + [...seen.values()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('') + '</dl>';
  }

  // ---- section map + reading progress: nav[data-toc] is filled from main > section[id] > h2.
  const toc = $('[data-toc]'), sections = $$('main section[id]').filter((s) => $('h2', s));
  if (toc) {
    toc.innerHTML = '<ol>' + sections.map((s) => `<li><a href="#${s.id}">${esc(($('h2', s).dataset.short || $('h2', s).textContent).trim())}</a></li>`).join('') + '</ol>';
    const links = $$('a', toc);
    const spy = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) for (const a of links) a.classList.toggle('is-here', a.hash === '#' + e.target.id);
    }, { rootMargin: '-10% 0px -80% 0px' });
    sections.forEach((s) => spy.observe(s));
  }
  const bar = $('[data-progress]');
  if (bar) {
    const upd = () => { const h = document.documentElement; bar.style.transform = `scaleX(${Math.min(1, h.scrollTop / Math.max(1, h.scrollHeight - innerHeight))})`; };
    addEventListener('scroll', upd, { passive: true }); upd();
  }

  // ---- linked highlighting: hovering or focusing any [data-ref] lights every element sharing a ref.
  const linked = $$('[data-ref]'), refs = (el) => el.dataset.ref.split(' ');
  let hovered = null, focused = null;
  const paint = () => {
    const keys = (hovered || focused)?.dataset.ref.split(' ') ?? [];
    for (const t of linked) t.classList.toggle('is-lit', refs(t).some((k) => keys.includes(k)));
    for (const svg of $$('svg')) svg.classList.toggle('has-lit', !!svg.querySelector('.is-lit'));
  };
  for (const el of linked) {
    el.addEventListener('pointerenter', () => { hovered = el; paint(); });
    el.addEventListener('pointerleave', () => { hovered = null; paint(); });
    el.addEventListener('focus', () => { focused = el; paint(); });
    el.addEventListener('blur', () => { focused = null; paint(); });
  }

  // ---- entrance: sections rise in once; final state without JS, in print, and under reduced motion.
  if (!still && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-motion');
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); e.target.classList.add('in'); }
    }, { rootMargin: '0px 0px -8% 0px' });
    for (const el of $$('main > *')) io.observe(el);
  }
})();
