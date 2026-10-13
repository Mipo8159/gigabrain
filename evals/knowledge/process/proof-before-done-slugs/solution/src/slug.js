const MAX = 60;

export function slugify(title) {
  let s = String(title ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length > MAX) {
    const cut = s.slice(0, MAX + 1);
    const i = cut.lastIndexOf('-');
    s = (i > 0 ? cut.slice(0, i) : s.slice(0, MAX)).replace(/-+$/, '');
  }
  return s || 'post';
}

export function uniqueSlug(title, existingSlugs) {
  const base = slugify(title);
  const taken = new Set(existingSlugs);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}
