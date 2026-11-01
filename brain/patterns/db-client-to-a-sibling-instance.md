---
name: db-client-to-a-sibling-instance
description: "Adding a DB GUI connection to another cloud DB instance: build the hostname from the IaC instance id + a known endpoint's account suffix; check the engine the server reports, not the icon; edit the GUI's config only after the app quits. 2026-11-02."
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

**How to apply:**
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
which host holds what.
