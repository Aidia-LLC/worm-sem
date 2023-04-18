import { Trapezoid, Vertex } from "@dto/canvas";

export function isPointInTrapezoid(
  x: number,
  y: number,
  trapezoids: Trapezoid[]
) {
  for (const trapezoid of trapezoids) {
    const { top, bottom, left, right } = trapezoid;
    if (y < top.y1 && y < top.y2) continue;
    if (x < left.x1 && x < left.x2) continue;
    if (x > right.x1 && x > right.x2) continue;
    if (y > bottom.y1 && y > bottom.y2) continue;
    return { inTrapezoid: true, trapezoid };
  }
  return { inTrapezoid: false, trapezoid: null };
}

export function findNearestPoint(x: number, y: number, points: Vertex[]) {
  let nearestPoint: Vertex | undefined;
  let nearestDistance = Infinity;
  for (const point of points) {
    const distance = Math.sqrt(
      Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2)
    );
    if (distance < nearestDistance) {
      nearestPoint = point;
      nearestDistance = distance;
    }
  }
  return { nearestDistance, nearestPoint };
}
