import { rectContains, type Zone } from './types';

/**
 * Zone under the point (table-local logical px), or null.
 * Pure; zones are disjoint half-open rects, so at most one can match.
 */
export function hitTest(zones: readonly Zone[], x: number, y: number): Zone | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  for (const zone of zones) if (rectContains(zone.rect, x, y)) return zone;
  return null;
}
