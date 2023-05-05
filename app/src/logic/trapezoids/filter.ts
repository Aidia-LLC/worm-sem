import { Trapezoid, RibbonData } from "@dto/canvas";

export function filterTrapezoids(
  trapezoids: Trapezoid[],
  sets: RibbonData[]
): Trapezoid[] {
  const centerPoints = trapezoids.map((t, i) => ({
    x: ((t.top.x1 + t.top.x2) / 2 + (t.bottom.x1 + t.bottom.x2) / 2) / 2,
    y: ((t.top.y1 + t.top.y2) / 2 + (t.bottom.y1 + t.bottom.y2) / 2) / 2,
    i,
  }));
  const setsCenterPoints = sets
    .map((s) => s.trapezoids)
    .flat()
    .map((t) => ({
      x: ((t.top.x1 + t.top.x2) / 2 + (t.bottom.x1 + t.bottom.x2) / 2) / 2,
      y: ((t.top.y1 + t.top.y2) / 2 + (t.bottom.y1 + t.bottom.y2) / 2) / 2,
    }));
  const filtered = centerPoints.filter((p) => {
    const found = setsCenterPoints.find(
      (s) => Math.abs(s.x - p.x) < 30 && Math.abs(s.y - p.y) < 30
    );
    return !found;
  });
  const filtered2 = filtered.filter((p, idx) => {
    const found = filtered.find(
      (p2, idx2) =>
        idx !== idx2 && Math.abs(p2.x - p.x) < 30 && Math.abs(p2.y - p.y) < 30
    );
    return !found;
  });
  return filtered2.map((p) => trapezoids[p.i]);
}
