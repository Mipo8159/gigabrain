// Old SQLite-backed session store. Replaced by src/sessions.js.
export function legacyUserFor(db, token) {
  const row = db.prepare('SELECT user_id FROM legacy_sessions WHERE token = ?').get(token);
  return row ? row.user_id : null;
}
