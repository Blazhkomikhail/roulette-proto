import { Rectangle, type Container, type FederatedPointerEvent } from 'pixi.js';
import { hitTest } from '../geometry/hitTest';
import type { Zone } from '../geometry/types';

export interface TableInputHandlers {
  onHover(zone: Zone | null): void;
}

/**
 * Pointer → zone. Coordinates are taken in the table container's local space
 * (logical px, independent of DPR and of any scaling of the container), then hit-tested.
 */
export function bindTableInput(
  target: Container,
  zones: readonly Zone[],
  size: { width: number; height: number },
  handlers: TableInputHandlers,
): void {
  target.eventMode = 'static';
  target.hitArea = new Rectangle(0, 0, size.width, size.height);

  let current: Zone | null = null;
  const update = (zone: Zone | null): void => {
    target.cursor = zone ? 'pointer' : 'default';
    if (zone?.id === current?.id) return;
    current = zone;
    handlers.onHover(zone);
  };

  target.on('pointermove', (e: FederatedPointerEvent) => {
    const p = e.getLocalPosition(target);
    update(hitTest(zones, p.x, p.y));
  });
  target.on('pointerleave', () => update(null));
}
