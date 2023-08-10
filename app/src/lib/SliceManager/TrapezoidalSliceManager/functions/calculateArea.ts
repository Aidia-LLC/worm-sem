import { TrapezoidalSlice } from "../types";

export function calculateArea(trapezoid: TrapezoidalSlice): number {
  const a = Math.sqrt(
    (trapezoid.top.x1 - trapezoid.top.x2) ** 2 +
      (trapezoid.top.y1 - trapezoid.top.y2) ** 2
  );
  const b = Math.sqrt(
    (trapezoid.bottom.x1 - trapezoid.bottom.x2) ** 2 +
      (trapezoid.bottom.y1 - trapezoid.bottom.y2) ** 2
  );
  const c = Math.sqrt(
    (trapezoid.left.x1 - trapezoid.left.x2) ** 2 +
      (trapezoid.left.y1 - trapezoid.left.y2) ** 2
  );
  const d = Math.sqrt(
    (trapezoid.right.x1 - trapezoid.right.x2) ** 2 +
      (trapezoid.right.y1 - trapezoid.right.y2) ** 2
  );
  // Calculate the semiperimeter of the quadrilateral
  const s = (a + b + c + d) / 2;
  // Calculate the area using Brahmagupta's formula
  return Math.sqrt((s - a) * (s - b) * (s - c) * (s - d));
}
