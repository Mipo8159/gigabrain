export const stats = { started: 0, completed: 0, aborted: 0 };

const step = () => new Promise<void>((r) => setTimeout(r, 50));

/** Stands in for a multi-step aggregation (~300 ms). Checks the signal between steps. */
export async function buildReport(params: { days?: number }, signal?: AbortSignal): Promise<{ days: number; rows: number }> {
  stats.started++;
  for (let i = 0; i < 6; i++) {
    if (signal?.aborted) {
      stats.aborted++;
      throw signal.reason ?? new Error('aborted');
    }
    await step();
  }
  stats.completed++;
  const days = params.days ?? 7;
  return { days, rows: days * 10 };
}
