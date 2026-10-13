---
timeout: 600
heldout: true
---
Partners send us product feeds as NDJSON (one JSON object per line). We read them as streams (S3 object bodies, HTTP
uploads); a feed can be several GB, so it must not be loaded into memory at once.

Implement `readNdjson` in `src/ndjson.ts`:

```ts
import type { Readable } from 'node:stream';
export async function* readNdjson(input: Readable): AsyncGenerator<unknown>
```

- Yield one parsed value per line, in order.
- Lines may end with `\n` or `\r\n`; the last line may have no trailing newline.
- Skip blank (or whitespace-only) lines.
- A line that isn't valid JSON should make the generator throw (an error mentioning the line number is nice to have).

Feeds come from many countries, so expect any Unicode in the values. No dependencies.
