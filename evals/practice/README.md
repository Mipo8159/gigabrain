# Practice repos for `/intent-review audit` (answer keys)

Two fake take-home submissions live **outside** gigabrain, so an audit run inside them can't
see these keys: `~/Desktop/workdir/sweeft/practice-task-tracker` and `practice-shop-orders`.
Both are Express + pg (plain JS), `npm test` is green (bugs and all), `docker compose up -d` gives Postgres.

Score a run: count the key rows the report found (with correct status), count false alarms,
and check whether the plan ranks the blockers first. Rebuild a repo: delete it and ask Claude
to regenerate from the key (the planted code is described per row).
