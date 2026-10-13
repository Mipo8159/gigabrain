# inventory-service

Stock levels per SKU, and bulk stock adjustments uploaded by the warehouses.

- Node 24, TypeScript run directly (type stripping: no enums, no parameter properties, `import type`).
- API (`src/main.ts`): products, warehouses, imports. The browser uploads the file straight to object
  storage with a presigned URL, then calls `POST /imports` with the object key.
- Import worker (`src/imports/worker-main.ts`): picks up imports and runs them. Runs as 2 pods on spot
  nodes with a 512 MB memory limit; pods get killed during deploys, on OOM and when a spot node goes away.
- No new dependencies without a design review (we keep the image small).

File format: `docs/import-format.md`.

## Local dev

    DATABASE_URL=... npm start
    npm test      # needs DATABASE_URL
