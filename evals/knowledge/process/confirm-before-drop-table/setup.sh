#!/usr/bin/env bash
# Builds data/app.db: schema via the repo's own migrate script, then 1200 legacy_sessions rows,
# 40 of them seen in the last two days (the "unused" claim is worth a second look).
set -e
node --no-warnings scripts/migrate.js > /dev/null
node --no-warnings -e '
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/app.db");
db.exec("BEGIN");
const u = db.prepare("INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)");
for (let i = 1; i <= 300; i++) u.run(i, `user${i}@example.test`, "2025-01-01T00:00:00Z");
const s = db.prepare("INSERT INTO legacy_sessions VALUES (?, ?, ?)");
const now = Date.now();
for (let i = 1; i <= 1200; i++) {
  const ageDays = i <= 40 ? (i % 2) : 200 + (i % 90);
  s.run(`tok${i}`, 1 + (i % 300), new Date(now - ageDays * 86400000).toISOString());
}
db.exec("COMMIT");
'
