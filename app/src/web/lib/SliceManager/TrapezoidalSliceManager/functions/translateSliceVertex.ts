import { TrapezoidalSlice } from "../types";

export const translateSliceVertex = ({
  slice,
  position,
  dx,
  dy,
}: {
  slice: TrapezoidalSlice;
  position: string;
  dx: number;
  dy: number;
}): TrapezoidalSlice => {
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
      x1: b1 ? slice.bottom.x1 + dx : slice.bottom.x1,
      y1: b1 ? slice.bottom.y1 + dy : slice.bottom.y1,
      x2: b2 ? slice.bottom.x2 + dx : slice.bottom.x2,
      y2: b2 ? slice.bottom.y2 + dy : slice.bottom.y2,
    },
    top: {
      x1: t1 ? slice.top.x1 + dx : slice.top.x1,
      y1: t1 ? slice.top.y1 + dy : slice.top.y1,
      x2: t2 ? slice.top.x2 + dx : slice.top.x2,
      y2: t2 ? slice.top.y2 + dy : slice.top.y2,
    },
    left: {
      x1: l1 ? slice.left.x1 + dx : slice.left.x1,
      y1: l1 ? slice.left.y1 + dy : slice.left.y1,
      x2: l2 ? slice.left.x2 + dx : slice.left.x2,
      y2: l2 ? slice.left.y2 + dy : slice.left.y2,
    },
    right: {
      x1: r1 ? slice.right.x1 + dx : slice.right.x1,
      y1: r1 ? slice.right.y1 + dy : slice.right.y1,
      x2: r2 ? slice.right.x2 + dx : slice.right.x2,
      y2: r2 ? slice.right.y2 + dy : slice.right.y2,
    },
  };
};

const getSliceVertex = (slice: TrapezoidalSlice, position: string) => {
  switch (position) {
    case "top1":
      return { x: slice.top.x1, y: slice.top.y1 };
    case "top2":
      return { x: slice.top.x2, y: slice.top.y2 };
    case "bottom1":
      return { x: slice.bottom.x1, y: slice.bottom.y1 };
    case "bottom2":
      return { x: slice.bottom.x2, y: slice.bottom.y2 };
    default:
      throw new Error("Invalid position");
  }
};

const arePointsEqual = (
  p1: { x: number; y: number },
  p2: { x: number; y: number }
) => p1.x === p2.x && p1.y === p2.y;
