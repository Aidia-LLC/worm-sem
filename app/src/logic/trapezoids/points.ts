import { Trapezoid, Vertex } from "src/types/canvas";
import { calculateArea } from "@logic/canvas";

export function isPointInTrapezoid(
  x: number,
  y: number,
  trapezoids: Trapezoid[]
) {
  for (const trapezoid of trapezoids) {
    const { top, bottom, left, right } = trapezoid;
    const trapezoidArea = calculateArea(trapezoid);
    let sum = 0;
    // sum up area of triangle between the point and each side of the trapezoid
    sum += Math.abs(
      0.5 *
        (top.x1 * top.y2 +
          top.x2 * y +
          x * top.y1 -
          (top.x2 * top.y1 + x * top.y2 + top.x1 * y))
    );
    sum += Math.abs(
      0.5 *
        (bottom.x1 * bottom.y2 +
          bottom.x2 * y +
          x * bottom.y1 -
          (bottom.x2 * bottom.y1 + x * bottom.y2 + bottom.x1 * y))
    );
    sum += Math.abs(
      0.5 *
        (left.x1 * left.y2 +
          left.x2 * y +
          x * left.y1 -
          (left.x2 * left.y1 + x * left.y2 + left.x1 * y))
    );
    sum += Math.abs(
      0.5 *
        (right.x1 * right.y2 +
          right.x2 * y +
          x * right.y1 -
          (right.x2 * right.y1 + x * right.y2 + right.x1 * y))
    );
    // if the sum of the areas of the triangles is equal to the area of the trapezoid, the point is inside the trapezoid
    if (sum < trapezoidArea * 1.05) {
      return { inTrapezoid: true, trapezoid };
    }
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
