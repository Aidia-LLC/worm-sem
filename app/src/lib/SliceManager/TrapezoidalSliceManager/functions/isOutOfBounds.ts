import { TrapezoidalSlice } from "../types";

export const isOutOfBounds = (details: {
  shape: TrapezoidalSlice;
  canvas: {
    width: number;
    height: number;
  };
}) => {
  const { shape, canvas } = details;
  const xs = [
    shape.left.x1,
    shape.left.x2,
    shape.right.x1,
    shape.right.x2,
    shape.top.x1,
    shape.top.x2,
    shape.bottom.x1,
    shape.bottom.x2,
  ];
  const ys = [
    shape.top.y1,
    shape.top.y2,
    shape.bottom.y1,
    shape.bottom.y2,
    shape.left.y1,
    shape.left.y2,
    shape.right.y1,
    shape.right.y2,
  ];
  const low = Math.min(...xs, ...ys);
  const highX = Math.max(...xs);
  const highY = Math.max(...ys);
  return low < 0 || highX > canvas.width || highY > canvas.height;
};
