export const REGIONS = ['eu', 'us', 'apac', 'latam'] as const;
export type Region = (typeof REGIONS)[number];

export type RolloutConfig = {
  flag: string;
  defaultPercent: number;
  regionOverrides: Partial<Record<Region, number>>;
  killSwitch: boolean;
};

export type FieldError = { path: string; message: string };

export type ParseResult =
  | { ok: true; config: RolloutConfig }
  | { ok: false; errors: FieldError[] };
