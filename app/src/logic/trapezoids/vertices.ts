import { RibbonData, Slice, Vertex } from "@data/shapes";

export function findNearestVertex(x: number, y: number, ribbons: RibbonData[]) {
  let nearestVertex: Vertex | undefined;
  let nearestDistance = Infinity;
  let nearestSlice: Slice | undefined;
  let nearestRibbonId: RibbonData["id"] | undefined;
  let position: "top1" | "top2" | "bottom1" | "bottom2" | undefined;

  for (const ribbon of ribbons) {
    for (const slice of ribbon.slices) {
      const vertices = [
        { x: slice.top.x1, y: slice.top.y1, position: "top1" as const },
        { x: slice.top.x2, y: slice.top.y2, position: "top2" as const },
        {
          x: slice.bottom.x1,
          y: slice.bottom.y1,
          position: "bottom1" as const,
        },
        {
          x: slice.bottom.x2,
          y: slice.bottom.y2,
          position: "bottom2" as const,
        },
      ];
      for (const vertex of vertices) {
        const distance = Math.sqrt(
          Math.pow(vertex.x - x, 2) + Math.pow(vertex.y - y, 2)
        );
        if (distance < nearestDistance) {
          nearestVertex = vertex;
          nearestDistance = distance;
          nearestSlice = slice;
          nearestRibbonId = ribbon.id;
          position = vertex.position;
        }
      }
    }
  }
  return {
    distance: nearestDistance,
    vertex: nearestVertex!,
    slice: nearestSlice!,
    ribbonId: nearestRibbonId!,
    vertexPosition: position!,
  };
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

export const translateSliceVertex = (
  slice: Slice,
  position: "top1" | "top2" | "bottom1" | "bottom2",
  distance: { x: number; y: number }
): Slice => {
  const vertex = getSliceVertex(slice, position);
  const b1 = arePointsEqual(vertex, { x: slice.bottom.x1, y: slice.bottom.y1 });
  const b2 = arePointsEqual(vertex, { x: slice.bottom.x2, y: slice.bottom.y2 });
  const t1 = arePointsEqual(vertex, { x: slice.top.x1, y: slice.top.y1 });
  const t2 = arePointsEqual(vertex, { x: slice.top.x2, y: slice.top.y2 });
  const l1 = arePointsEqual(vertex, { x: slice.left.x1, y: slice.left.y1 });
  const l2 = arePointsEqual(vertex, { x: slice.left.x2, y: slice.left.y2 });
  const r1 = arePointsEqual(vertex, { x: slice.right.x1, y: slice.right.y1 });
  const r2 = arePointsEqual(vertex, { x: slice.right.x2, y: slice.right.y2 });

  return {
    ...slice,
    bottom: {
      x1: b1 ? slice.bottom.x1 + distance.x : slice.bottom.x1,
      y1: b1 ? slice.bottom.y1 + distance.y : slice.bottom.y1,
      x2: b2 ? slice.bottom.x2 + distance.x : slice.bottom.x2,
      y2: b2 ? slice.bottom.y2 + distance.y : slice.bottom.y2,
    },
    top: {
      x1: t1 ? slice.top.x1 + distance.x : slice.top.x1,
      y1: t1 ? slice.top.y1 + distance.y : slice.top.y1,
      x2: t2 ? slice.top.x2 + distance.x : slice.top.x2,
      y2: t2 ? slice.top.y2 + distance.y : slice.top.y2,
    },
    left: {
      x1: l1 ? slice.left.x1 + distance.x : slice.left.x1,
      y1: l1 ? slice.left.y1 + distance.y : slice.left.y1,
      x2: l2 ? slice.left.x2 + distance.x : slice.left.x2,
      y2: l2 ? slice.left.y2 + distance.y : slice.left.y2,
    },
    right: {
      x1: r1 ? slice.right.x1 + distance.x : slice.right.x1,
      y1: r1 ? slice.right.y1 + distance.y : slice.right.y1,
      x2: r2 ? slice.right.x2 + distance.x : slice.right.x2,
      y2: r2 ? slice.right.y2 + distance.y : slice.right.y2,
    },
  };
};

const getSliceVertex = (
  slice: Slice,
  position: "top1" | "top2" | "bottom1" | "bottom2"
) => {
  switch (position) {
    case "top1":
      return { x: slice.top.x1, y: slice.top.y1 };
    case "top2":
      return { x: slice.top.x2, y: slice.top.y2 };
    case "bottom1":
      return { x: slice.bottom.x1, y: slice.bottom.y1 };
    case "bottom2":
      return { x: slice.bottom.x2, y: slice.bottom.y2 };
  }
};

const arePointsEqual = (
  p1: { x: number; y: number },
  p2: { x: number; y: number }
) => p1.x === p2.x && p1.y === p2.y;
