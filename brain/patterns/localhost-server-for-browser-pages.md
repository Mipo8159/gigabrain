---
name: localhost-server-for-browser-pages
description: "A small 127.0.0.1 server that serves pages and accepts POSTs is reachable from every website in the same browser: check Host (DNS rebinding) and Origin (CSRF), escape every `<` in JSON embedded in <script>, never put URL params into hrefs, and keep it alive while a long page is open."
metadata:
  type: feedback
---

**In short:** binding to 127.0.0.1 is not isolation from the web. Any page in
the browser can send it requests, and a rebinding domain can read its answers.

**Why:** 2026-10-15, `bin/learn serve` (lessons + exams, results appended to a
log). The background reviewer reproduced, before any user touched it:
- **Lost data:** the server stopped after 2 h idle, and a 130-minute exam made
  no requests until the final POST, so the result was lost.
- **Dead page:** `"</"` → `"<\/"` escaping of JSON inside `<script>` still let
  the text `<!--<script` swallow the runner (the HTML parser's double-escaped
  state). Escaping every `<` as `<` fixed it.
- **XSS:** a `?back=` URL param rendered into an `href` let `javascript:` run in
  the 127.0.0.1 origin, which then passed the Origin check.
- **DNS rebinding:** with no Host check, a foreign name resolving to 127.0.0.1
  read every page (answers, scores).

**How to apply:**
- In every handler, 403 unless `Host` is `127.0.0.1:<port>` or `localhost:<port>`;
  for POST also 403 unless `Origin` is absent or the same.
- Embed data with every `<` escaped as `<`; validate types of anything
  logged before rendering it back (one bad row must not break a page).
- No URL params into `href`/`src`; build links server-side.
- Long-lived pages ping `/health`; results are kept client-side until a save succeeds.
- Test: a forged-Origin POST and a rebinding Host GET expect 403.

**Signal:** "serve this locally", a localhost helper, a dev dashboard that writes files.
**Next time:** Host + Origin checks and the `<` escape from the first version;
put the 403 cases in the test.

Related: [[role-gating-lives-on-the-route]], [[test-guards-against-innocent-lookalikes]].
