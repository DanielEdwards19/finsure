import type { CanvasView } from "./answers";

/** Two canvas views are the same record, not merely the same kind. */
export const sameView = (a: CanvasView, b: CanvasView): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * Trail after opening `next` from `from`.
 *
 * The map is always the Home crumb, so it is never recorded. Opening the map
 * (or opening anything from the map) starts a fresh trail.
 */
export function trailAfter(
  from: CanvasView,
  trail: readonly CanvasView[],
  next: CanvasView,
): readonly CanvasView[] {
  if (sameView(from, next)) return trail;
  if (next.kind === "map" || from.kind === "map") return [];
  return [...trail, from];
}
