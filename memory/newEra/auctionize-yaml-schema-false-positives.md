---
name: auctionize-yaml-schema-false-positives
description: "auctionize's iac/*.yml are CloudFormation fragments, so the VS Code YAML extension reports bogus schema errors naming unrelated resource types — silenced via .vscode/settings.json."
metadata: 
  node_type: memory
  type: project
  modified: 2026-08-14T12:58:12.104Z
  originSessionId: 09021c69-fdc0-48b0-b9a5-ac0fa7c3a534
---

If VS Code reports something like **`Incorrect type. Expected "MongoDBAtlasX509AuthenticationDatabaseUser"`** on an auctionize YAML file, it is a false positive — not a real schema expectation, and nothing to do with MongoDB.

**Why it happens:** the files under `auction/iac/` and `auth/iac/` are CloudFormation *fragments*, not templates. `AuctionsTable.yml`'s root is the bare logical ID `AuctionsTable:`; `AuctionsTableIAM.yml`'s root is a YAML anchor holding a loose IAM statement (`&AuctionsTableIAM` reused via `<<:` merge keys). Serverless splices them in with `${file(iac/resource/AuctionsTable.yml):AuctionsTable}`. None has a `Resources:` root, so none is a valid standalone template. `redhat.vscode-yaml` auto-detects "this is CloudFormation" from `Type: AWS::DynamoDB::Table`, validates against a schemastore schema whose root is a huge `oneOf` over every registered resource type — including third-party registry types — and on failure reports one arbitrary branch name. The named type is meaningless.

`serverless.yml` trips the same machinery for a different reason: `${...}` variables and `!Ref`/`!GetAtt` custom tags that generic schemas mis-parse.

**Fix, already applied:** `auctionize/.vscode/settings.json` sets `yaml.disableSchemaDetection` for `**/iac/**/*.yml` and `**/serverless.yml`. That is a real setting in the installed redhat.vscode-yaml 1.24.0 (verified against its `package.json`; the sibling settings are `yaml.schemas`, `yaml.validate`, `yaml.schemaStore.enable`). VS Code auto-merges the GitHub/Gitea/Forgejo workflow globs into that array — expected, harmless. Drop the `serverless.yml` line if Serverless Framework schema hints are wanted back.

**The real validator is `sls package --stage dev`**, which resolves the file references and variables first — no static schema can. Verified the fragments resolve correctly: `AuctionsTable` emerges as a real `AWS::DynamoDB::Table` with its `statusAndEndDate` GSI intact.

Related: `dist/` was stale tsc output containing dead SDK v2 code, consumed by nothing (Serverless bundles from `src/` via esbuild into `.serverless/build/`). Deleted 2026-08-14 and added to all three `.gitignore`s, along with removing the dead `.webpack` entry inherited from the `sls-base` template. See [[auctionize-is-serverless-aws-no-local-stack]].
