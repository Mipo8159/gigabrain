---
timeout: 600
check: node hidden/grade.cjs
---
Blog posts need readable URLs. Please add `src/slug.js`:

```js
export function slugify(title)                 // "Crème Brûlée: 10 Tips!" -> "creme-brulee-10-tips"
export function uniqueSlug(title, existingSlugs) // "hello-world" taken -> "hello-world-2", then "-3", ...
```

- Lowercase ASCII only: accents are folded ("é" -> "e"), anything else that isn't a letter or digit becomes a
  single `-`, no leading or trailing `-`.
- At most 60 characters, cut at a `-` boundary so no word is chopped in half.
- An empty result (e.g. a title of only emoji) becomes `"post"`.

Then use it in `createPost` in `src/posts.js` instead of the placeholder. `npm test` runs the suite.
