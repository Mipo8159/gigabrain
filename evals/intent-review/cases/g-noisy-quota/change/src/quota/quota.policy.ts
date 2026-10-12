import { Grade } from '../auth/user';

/**
 * Pending-item limits per creator grade.
 * Kept in one table so product can tune numbers without touching the service.
 */
export const PENDING_LIMITS: Record<Grade, number> = {
  RESTRICTED: 3,
  DEFAULT: 20,
  PREMIUM: 100, // effectively unlimited
};

export function limitFor(grade: Grade): number {
  return PENDING_LIMITS[grade];
}
