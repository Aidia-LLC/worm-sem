import { Slice, Trapezoid, Vertex } from "src/types/canvas";

export function findNearestVertex(
  x: number,
  y: number,
  trapezoids: Trapezoid[]
) {
  let nearestVertex: Vertex | undefined;
  let nearestDistance = Infinity;
  for (const trapezoid of trapezoids) {
    const vertices = [
      { x: trapezoid.top.x1, y: trapezoid.top.y1 },
      { x: trapezoid.top.x2, y: trapezoid.top.y2 },
      { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 },
      { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 },
    ];
    for (const vertex of vertices) {
      const distance = Math.sqrt(
        Math.pow(vertex.x - x, 2) + Math.pow(vertex.y - y, 2)
      );
      if (distance < nearestDistance) {
        nearestVertex = vertex;
        nearestDistance = distance;
      }
    }
  }
  return { nearestDistance, nearestVertex };
}

export function moveVertex(
  trapezoid: Slice,
  vertex: Vertex,
  x: number,
  y: number
) {
  const newTrapezoid = { ...trapezoid };
  if (newTrapezoid.top.x1 === vertex.x && newTrapezoid.top.y1 === vertex.y) {
    newTrapezoid.top.x1 = x;
    newTrapezoid.top.y1 = y;
  } else if (
    newTrapezoid.top.x2 === vertex.x &&
    newTrapezoid.top.y2 === vertex.y
  ) {
    newTrapezoid.top.x2 = x;
    newTrapezoid.top.y2 = y;
  } else if (
    newTrapezoid.bottom.x1 === vertex.x &&
    newTrapezoid.bottom.y1 === vertex.y
  ) {
    newTrapezoid.bottom.x1 = x;
    newTrapezoid.bottom.y1 = y;
  } else if (
    newTrapezoid.bottom.x2 === vertex.x &&
    newTrapezoid.bottom.y2 === vertex.y
  ) {
    newTrapezoid.bottom.x2 = x;
    newTrapezoid.bottom.y2 = y;
  }
  return newTrapezoid;
}
