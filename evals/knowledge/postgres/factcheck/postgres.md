# Postgres exam fact-check

Date: 2026-10-15. Current major: PostgreSQL 18 (18.6); 19 is at RC1 (https://www.postgresql.org/support/versioning/).
Files: evals/knowledge/postgres/exams/v1.json … v5.json

## v1.json

| id | verdict | source | note |
|---|---|---|---|
| postgres-v1-q01 | ok | known |  |
| postgres-v1-q02 | ok | known |  |
| postgres-v1-q03 | ok | known |  |
| postgres-v1-q04 | ok | known |  |
| postgres-v1-q05 | ok | known |  |
| postgres-v1-q06 | fixed | https://www.postgresql.org/docs/18/sql-altertable.html | why said CONCURRENTLY exists for index builds and partition detach; made precise (ALTER TABLE: DETACH PARTITION only) |
| postgres-v1-q07 | fixed | known (arithmetic) | 25k inserts/s contradicted "6 weeks" left (would be ~3 h); stem now 6M/day; negative-range why 3 years -> about a year |
| postgres-v1-q08 | ok | https://www.postgresql.org/docs/18/sql-createindex.html |  |
| postgres-v1-q09 | ok | known |  |
| postgres-v1-q10 | ok | https://www.postgresql.org/docs/18/functions-uuid.html | uuidv7() in PG18 confirmed |
| postgres-v1-q11 | ok | known |  |
| postgres-v1-q12 | ok | known |  |
| postgres-v1-q13 | fixed | https://www.pgbouncer.org/config.html | session mode also stops the leak; stem now requires keeping transaction pooling |
| postgres-v1-q14 | ok | https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-pinning.html |  |
| postgres-v1-q15 | ok | known |  |
| postgres-v1-q16 | ok | known | max_slot_wal_keep_size default -1; PG18 idle_replication_slot_timeout not among options |
| postgres-v1-q17 | ok | known |  |
| postgres-v1-q18 | ok | known |  |
| postgres-v1-q19 | fixed | https://www.postgresql.org/docs/18/routine-vacuuming.html | key used VACUUM FREEZE; PG18 docs say plain VACUUM, not FREEZE/FULL; key text, why and VACUUM FULL why fixed |
| postgres-v1-q20 | ok | known |  |

## v2.json

| id | verdict | source | note |
|---|---|---|---|
| postgres-v2-q01 | ok | known |  |
| postgres-v2-q02 | ok | known |  |
| postgres-v2-q03 | ok | https://www.postgresql.org/docs/18/sql-merge.html |  |
| postgres-v2-q04 | ok | known |  |
| postgres-v2-q05 | ok | known |  |
| postgres-v2-q06 | ok | https://www.postgresql.org/docs/18/sql-altertable.html |  |
| postgres-v2-q07 | ok | https://www.postgresql.org/docs/18/sql-altertable.html |  |
| postgres-v2-q08 | fixed | known | view why claimed INSTEAD OF trigger / "auto-updatable rules" needed; simple views are auto-updatable; reworded |
| postgres-v2-q09 | ok | https://www.postgresql.org/docs/18/sql-createindex.html |  |
| postgres-v2-q10 | fixed | https://www.postgresql.org/docs/18/sql-prepare.html | node-postgres unnamed param queries are re-parsed each call, so never reach a generic plan; made it a named prepared statement |
| postgres-v2-q11 | ok | known |  |
| postgres-v2-q12 | ok | known |  |
| postgres-v2-q13 | ok | https://www.pgbouncer.org/config.html | PgBouncer single-threaded, so_reuseport confirmed |
| postgres-v2-q14 | ok | known |  |
| postgres-v2-q15 | ok | known |  |
| postgres-v2-q16 | ok | https://www.postgresql.org/support/versioning/ | PG14 EOL 2026-11-12 confirmed |
| postgres-v2-q17 | ok | known |  |
| postgres-v2-q18 | fixed | https://www.postgresql.org/docs/18/runtime-config-autovacuum.html | stem pins PG17 so key holds; explain now notes PG18 autovacuum_vacuum_max_threshold 100M cap |
| postgres-v2-q19 | ok | known |  |
| postgres-v2-q20 | ok | known |  |

## v3.json

| id | verdict | source | note |
|---|---|---|---|
| postgres-v3-q01 | ok | known |  |
| postgres-v3-q02 | ok | https://www.postgresql.org/docs/18/sql-merge.html |  |
| postgres-v3-q03 | ok | known |  |
| postgres-v3-q04 | ok | known |  |
| postgres-v3-q05 | ok | known |  |
| postgres-v3-q06 | ok | https://www.postgresql.org/docs/18/sql-createtable.html |  |
| postgres-v3-q07 | ok | known |  |
| postgres-v3-q08 | fixed | https://www.postgresql.org/docs/18/sql-altertable.html | NOT VALID also allowed for NOT NULL since PG18 |
| postgres-v3-q09 | ok | known |  |
| postgres-v3-q10 | ok | known |  |
| postgres-v3-q11 | fixed | known | Redis batching could cut writes more; stem now excludes another data store |
| postgres-v3-q12 | fixed | https://www.pgbouncer.org/changelog.html | max_prepared_statements defaults to 200 since 1.24; option text updated |
| postgres-v3-q13 | ok | known |  |
| postgres-v3-q14 | ok | https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-pinning.html | SET pins on RDS Proxy PG; init query confirmed |
| postgres-v3-q15 | ok | known |  |
| postgres-v3-q16 | ok | known |  |
| postgres-v3-q17 | ok | known |  |
| postgres-v3-q18 | fixed | https://www.postgresql.org/docs/18/sql-createtable.html | per-table autovacuum_freeze_max_age above global is ignored; why corrected |
| postgres-v3-q19 | ok | known |  |
| postgres-v3-q20 | ok | known |  |

## v4.json

| id | verdict | source | note |
|---|---|---|---|
| postgres-v4-q01 | ok | known |  |
| postgres-v4-q02 | ok | known |  |
| postgres-v4-q03 | ok | known |  |
| postgres-v4-q04 | ok | known |  |
| postgres-v4-q05 | ok | known |  |
| postgres-v4-q06 | ok | known |  |
| postgres-v4-q07 | ok | https://www.postgresql.org/docs/18/sql-altertable.html |  |
| postgres-v4-q08 | ok | known |  |
| postgres-v4-q09 | ok | known |  |
| postgres-v4-q10 | ok | known |  |
| postgres-v4-q11 | ok | known |  |
| postgres-v4-q12 | ok | known |  |
| postgres-v4-q13 | ok | known |  |
| postgres-v4-q14 | ok | known |  |
| postgres-v4-q15 | ok | known |  |
| postgres-v4-q16 | ok | known | PG17 failover slots, synchronized_standby_slots |
| postgres-v4-q17 | ok | known |  |
| postgres-v4-q18 | ok | known |  |
| postgres-v4-q19 | ok | known |  |
| postgres-v4-q20 | ok | https://www.postgresql.org/docs/18/runtime-config-autovacuum.html |  |

## v5.json

| id | verdict | source | note |
|---|---|---|---|
| postgres-v5-q01 | ok | known |  |
| postgres-v5-q02 | ok | known |  |
| postgres-v5-q03 | ok | https://www.postgresql.org/docs/18/sql-createtable.html |  |
| postgres-v5-q04 | ok | known |  |
| postgres-v5-q05 | ok | known |  |
| postgres-v5-q06 | ok | https://www.postgresql.org/docs/18/sql-altertable.html |  |
| postgres-v5-q07 | ok | known |  |
| postgres-v5-q08 | ok | known |  |
| postgres-v5-q09 | ok | known | PG18 B-tree skip scan |
| postgres-v5-q10 | ok | known |  |
| postgres-v5-q11 | ok | known |  |
| postgres-v5-q12 | ok | known |  |
| postgres-v5-q13 | ok | known |  |
| postgres-v5-q14 | ok | https://repost.aws/knowledge-center/vpc-troubleshoot-nat-gateway-connection | NAT idle timeout 350 s |
| postgres-v5-q15 | ok | known |  |
| postgres-v5-q16 | ok | known |  |
| postgres-v5-q17 | ok | known |  |
| postgres-v5-q18 | ok | known |  |
| postgres-v5-q19 | ok | known |  |
| postgres-v5-q20 | ok | known |  |

bin/check-exam on all five files: exit 0 (0 problems).
