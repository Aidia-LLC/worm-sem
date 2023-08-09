import { TrapezoidalSlice } from "../types";

export const translateSlice = ({
  slice,
  dx,
  dy,
}: {
  slice: TrapezoidalSlice;
  dx: number;
  dy: number;
}): TrapezoidalSlice => {
  return {
    top: {
      x1: slice.top.x1 + dx,
      y1: slice.top.y1 + dy,
      x2: slice.top.x2 + dx,
      y2: slice.top.y2 + dy,
    },
    bottom: {
      x1: slice.bottom.x1 + dx,
      y1: slice.bottom.y1 + dy,
      x2: slice.bottom.x2 + dx,
      y2: slice.bottom.y2 + dy,
    },
    left: {
      x1: slice.left.x1 + dx,
      y1: slice.left.y1 + dy,
      x2: slice.left.x2 + dx,
      y2: slice.left.y2 + dy,
    },
    right: {
      x1: slice.right.x1 + dx,
      y1: slice.right.y1 + dy,
      x2: slice.right.x2 + dx,
      y2: slice.right.y2 + dy,
    },
    id: slice.id,
  } satisfies TrapezoidalSlice;
};
