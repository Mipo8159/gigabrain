import type { Region, RolloutConfig } from './types.ts';

/** Effective rollout percent for a region. */
export function percentFor(cfg: RolloutConfig, region: Region): number {
  if (cfg.killSwitch) return 0;
  return cfg.regionOverrides[region] ?? cfg.defaultPercent;
}
