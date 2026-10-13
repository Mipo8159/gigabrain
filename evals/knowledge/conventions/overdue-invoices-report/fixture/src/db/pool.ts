import pg from 'pg';

// bigint (int8) and numeric come back as strings by default; amounts here fit in a JS number.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));

export function createPool(url = process.env.DATABASE_URL): pg.Pool {
  return new pg.Pool({ connectionString: url, max: 10 });
}
