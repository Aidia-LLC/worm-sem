import { RibbonData, Trapezoid, Vertex } from "@data/shapes";
import { calculateArea } from "@logic/canvas";

export function isPointInTrapezoid(
  x: number,
  y: number,
  ribbons: RibbonData[]
) {
  for (const ribbon of ribbons) {
    for (const slice of ribbon.slices) {
      const { top, bottom, left, right } = slice;
      const trapezoidArea = calculateArea(slice);
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
        return { inTrapezoid: true, slice, ribbon };
      }
    }
  }

  return { inTrapezoid: false, slice: null, ribbon: null };
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

export const isOutOfBounds = (
  trapezoid: Trapezoid,
  canvas: {
    width: number;
    height: number;
  }
) => {
  const xs = [
    trapezoid.left.x1,
    trapezoid.left.x2,
    trapezoid.right.x1,
    trapezoid.right.x2,
    trapezoid.top.x1,
    trapezoid.top.x2,
    trapezoid.bottom.x1,
    trapezoid.bottom.x2,
  ];
  const ys = [
    trapezoid.top.y1,
    trapezoid.top.y2,
    trapezoid.bottom.y1,
    trapezoid.bottom.y2,
    trapezoid.left.y1,
    trapezoid.left.y2,
    trapezoid.right.y1,
    trapezoid.right.y2,
  ];
  const low = Math.min(...xs, ...ys);
  const highX = Math.max(...xs);
  const highY = Math.max(...ys);
  return low < 0 || highX > canvas.width || highY > canvas.height;
};
