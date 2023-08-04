import { RibbonData, Slice } from "../../types/canvas";

export const addTrapezoid = ({
  trapezoids,
  id,
  top = false,
}: {
  trapezoids: RibbonData["slices"];
  id: number;
  top: boolean;
}) => {
  // insert and identical trapezoid to either the beginning or end of the array
  const newTrapezoidSet = [...trapezoids];
  if (top) {
    const newTrapezoid = trapezoids[0];
    const referenceTrapezoid = trapezoids[1];
    const topTrapezoid: Slice = {
      id,
      top: {
        x1:
          newTrapezoid.top.x1 +
          (newTrapezoid.top.x1 - referenceTrapezoid.top.x1),
        x2:
          newTrapezoid.top.x2 +
          (newTrapezoid.top.x2 - referenceTrapezoid.top.x2),
        y1:
          newTrapezoid.top.y1 +
          (newTrapezoid.top.y1 - referenceTrapezoid.top.y1),
        y2:
          newTrapezoid.top.y2 +
          (newTrapezoid.top.y2 - referenceTrapezoid.top.y2),
      },
      bottom: {
        x1:
          newTrapezoid.bottom.x1 +
          (newTrapezoid.bottom.x1 - referenceTrapezoid.bottom.x1),
        x2:
          newTrapezoid.bottom.x2 +
          (newTrapezoid.bottom.x2 - referenceTrapezoid.bottom.x2),
        y1:
          newTrapezoid.bottom.y1 +
          (newTrapezoid.bottom.y1 - referenceTrapezoid.bottom.y1),
        y2:
          newTrapezoid.bottom.y2 +
          (newTrapezoid.bottom.y2 - referenceTrapezoid.bottom.y2),
      },
      left: {
        x1:
          newTrapezoid.left.x1 +
          (newTrapezoid.left.x1 - referenceTrapezoid.left.x1),
        x2:
          newTrapezoid.left.x2 +
          (newTrapezoid.left.x2 - referenceTrapezoid.left.x2),
        y1:
          newTrapezoid.left.y1 +
          (newTrapezoid.left.y1 - referenceTrapezoid.left.y1),
        y2:
          newTrapezoid.left.y2 +
          (newTrapezoid.left.y2 - referenceTrapezoid.left.y2),
      },
      right: {
        x1:
          newTrapezoid.right.x1 +
          (newTrapezoid.right.x1 - referenceTrapezoid.right.x1),
        x2:
          newTrapezoid.right.x2 +
          (newTrapezoid.right.x2 - referenceTrapezoid.right.x2),
        y1:
          newTrapezoid.right.y1 +
          (newTrapezoid.right.y1 - referenceTrapezoid.right.y1),
        y2:
          newTrapezoid.right.y2 +
          (newTrapezoid.right.y2 - referenceTrapezoid.right.y2),
      },
    };
    newTrapezoidSet.unshift(topTrapezoid);
  } else {
    const newTrapezoid = trapezoids[trapezoids.length - 1];
    const referenceTrapezoid = trapezoids[trapezoids.length - 2];
    const bottomTrapezoid: Slice = {
      id,
      top: {
        x1:
          newTrapezoid.top.x1 +
          (newTrapezoid.top.x1 - referenceTrapezoid.top.x1),
        x2:
          newTrapezoid.top.x2 +
          (newTrapezoid.top.x2 - referenceTrapezoid.top.x2),
        y1:
          newTrapezoid.top.y1 +
          (newTrapezoid.top.y1 - referenceTrapezoid.top.y1),
        y2:
          newTrapezoid.top.y2 +
          (newTrapezoid.top.y2 - referenceTrapezoid.top.y2),
      },
      bottom: {
        x1:
          newTrapezoid.bottom.x1 +
          (newTrapezoid.bottom.x1 - referenceTrapezoid.bottom.x1),
        x2:
          newTrapezoid.bottom.x2 +
          (newTrapezoid.bottom.x2 - referenceTrapezoid.bottom.x2),
        y1:
          newTrapezoid.bottom.y1 +
          (newTrapezoid.bottom.y1 - referenceTrapezoid.bottom.y1),
        y2:
          newTrapezoid.bottom.y2 +
          (newTrapezoid.bottom.y2 - referenceTrapezoid.bottom.y2),
      },
      left: {
        x1:
          newTrapezoid.left.x1 +
          (newTrapezoid.left.x1 - referenceTrapezoid.left.x1),
        x2:
          newTrapezoid.left.x2 +
          (newTrapezoid.left.x2 - referenceTrapezoid.left.x2),
        y1:
          newTrapezoid.left.y1 +
          (newTrapezoid.left.y1 - referenceTrapezoid.left.y1),
        y2:
          newTrapezoid.left.y2 +
          (newTrapezoid.left.y2 - referenceTrapezoid.left.y2),
      },
      right: {
        x1:
          newTrapezoid.right.x1 +
          (newTrapezoid.right.x1 - referenceTrapezoid.right.x1),
        x2:
          newTrapezoid.right.x2 +
          (newTrapezoid.right.x2 - referenceTrapezoid.right.x2),
        y1:
          newTrapezoid.right.y1 +
          (newTrapezoid.right.y1 - referenceTrapezoid.right.y1),
        y2:
          newTrapezoid.right.y2 +
          (newTrapezoid.right.y2 - referenceTrapezoid.right.y2),
      },
    };
    newTrapezoidSet.push(bottomTrapezoid);
  }
  return newTrapezoidSet;
};
