import { Shape, ShapeSet } from "@SliceManager/types";
import { TrapezoidalSlice } from "../types";
// import { calculateArea } from "./calculateArea";

export const findContainingSlice = ({
  point,
  sets,
}: {
  point: [number, number];
  sets: ShapeSet[];
}) => {
  const [x, y] = point;
  let smallestArea = { sum: Infinity, slice: null, set: null } as {
    sum: number;
    slice: Shape | null;
    set: ShapeSet | null;
  };
  for (const ribbon of sets) {
    for (const slice of ribbon.slices) {
      const { top, bottom, left, right } = slice;
      // const trapezoidArea = calculateArea(slice as TrapezoidalSlice);
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
      if (sum < smallestArea.sum) {
        smallestArea = { sum, slice, set: ribbon };
      }
      // if the sum of the areas of the triangles is equal to the area of the trapezoid, the point is inside the trapezoid
      // if (sum < trapezoidArea * 1.05) {
      //   return { slice: slice as TrapezoidalSlice, set: ribbon };
      // }
    }
  }
  if (smallestArea.slice) {
    return {
      slice: smallestArea.slice as TrapezoidalSlice,
      set: smallestArea.set as ShapeSet,
    };
  }
  return null;
};
