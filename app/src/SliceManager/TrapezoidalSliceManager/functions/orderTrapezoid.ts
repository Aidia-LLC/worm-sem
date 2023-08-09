import { TrapezoidalSlice } from "../types";

export const orderTrapezoids = (trapezoids: TrapezoidalSlice[]) => {
  // order with the top trapezoid being 1
  return trapezoids.sort((a, b) => {
    const aTop = Math.min(a.top.y1, a.top.y2);
    const bTop = Math.min(b.top.y1, b.top.y2);
    return aTop - bTop;
  });
};
