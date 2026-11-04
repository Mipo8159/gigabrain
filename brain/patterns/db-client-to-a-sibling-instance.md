---
name: db-client-to-a-sibling-instance
description: "Adding a DB GUI connection to another cloud DB instance: build the hostname from the IaC instance id + a known endpoint's account suffix; check the engine the server reports, not the icon; edit the GUI's config only after the app quits; a failing copy = diff its config vs the source first (a clone kept the prod host). 2026-11-02/03."
metadata:
  type: feedback
---

**In short:** when Giga needs a DB client (DBeaver and similar) pointed at a
second instance next to one that already works, don't guess from hostnames
and don't hunt for the endpoint in config or secret files. Read the instance
names in the infrastructure code, then build the endpoint from the working
one.

**Why:** 2026-11-02, a prod MySQL connection next to a working prod MariaDB one.
- Claude first guessed from the MariaDB hostname that the MySQL data might live
  there too. Giga was sure of a separate instance, and was right. The IaC file
  listed both instances in one place, which ended the debate in one grep.
- Managed DB endpoints are `<instance-id>.<account+region suffix>.<region>.rds.amazonaws.com`.
  The suffix is the same for every instance in the account and region, so a
  known endpoint plus the instance id from IaC gave the right host. Test
  Connection passed first time.
- The copied connection kept the MariaDB driver and icon, so Giga thought the
  server was MariaDB. The client's debug log line
  `Connected to a datasource … databaseProductName='MySQL', databaseProductVersion='8.4.8'`
  showed what the server really was.
- Claude told Giga to use a "Change driver type" button it had never seen. It
  wasn't there, which cost a round.

2026-11-03, the staging pair, copied from the prod connections:
- The IaC named staging `test`, not `staging` (`-test` instances, `_test`
  DBs). Public DNS resolved all four private DB names, which proved they
  existed without touching any data.
- The copy kept the **prod host** on the Main tab; only the SSH host was
  changed. The staging bastion couldn't reach prod, so the client said
  `Expected to read 4 bytes, read 0 bytes`. Claude spent two rounds on an
  `ssh -v -L` tunnel test before reading the client's config file
  (non-secret fields only), which showed the wrong host in one command.
- A second copy was cloned from the wrong source (MySQL instead of MariaDB),
  so it had both the wrong driver and the wrong host behind a "MariaDB" name.
  The fix was a config edit with the app closed.
- The working login lived in a shared password-manager item, found by
  searching the tunnel hostname, not "test".

**How to apply:**
0. A copied connection fails: first dump the client's connection config
   (name, driver, host, db, SSH host; never credentials) for source and copy
   side by side. Debug the network only if those match.
1. Endpoint: grep IaC for the instance definitions (`DBInstanceIdentifier`,
   `Engine:`) and the monitoring config's per-env list, then put the id in
   front of a known endpoint's suffix. Present it as derived and let Test
   Connection prove it.
2. Engine: trust what the server reported in the client's log or
   `SELECT VERSION()`, never the icon (it shows the driver).
3. Config edits: desktop clients rewrite their config on quit. Back it up,
   then run a background wait-for-exit job that applies the edit once the
   process is gone. Keep the connection id so saved credentials stay linked.
4. UI steps: name only menus you've seen in Giga's screenshot. Otherwise give
   a path that doesn't depend on them ("new connection, copy these fields").

**Signal:** "add <db> to dbeaver/datagrip", "which host is prod X", a
screenshot of a connection dialog, an icon that "looks wrong".

**Next time:** grep IaC for the instance list before saying anything about
which host holds what; when a copy fails, diff its config against the source
before any tunnel test.

2026-11-04, a third server, read-only check of one service's tables:
- **The same DB name existed on two servers** (`<svc>_test` on MySQL belonged to the
  old v1 service; v2's lived on MariaDB). Claude trusted a memory note ("svc is on
  MySQL"), and Giga hit `Table … doesn't exist`. The service's own config named the
  server (`/Discovery/Mariadb/...`). Read that, not a note.
- **`Access denied … @'<bastion IP>' (using password: YES)` means the tunnel and host
  are fine and the account is missing.** DB users are per server, and replicas copy
  the primary's users, so swapping host aliases can't fix it. Three logins from the
  shared vault were tried and denied. In this org, people get personal `first.last` DB
  users from ops. Say so after the first denial, not the third.
- A guessed log-group name with a leading `/` failed. One `describe-log-groups
  --log-group-name-pattern` call gave the real name.
