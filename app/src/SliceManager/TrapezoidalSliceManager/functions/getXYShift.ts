import { TrapezoidalSlice } from "../types";
import { calculateArea } from "./calculateArea";

export const getXYShift = (trapezoid: TrapezoidalSlice) => {
  const length = Math.round(
    Math.sqrt(
      (trapezoid.top.x1 - trapezoid.top.x2) ** 2 +
        (trapezoid.top.y1 - trapezoid.top.y2) ** 2
    )
  );
  const bottomLength = Math.round(
    Math.sqrt(
      (trapezoid.bottom.x1 - trapezoid.bottom.x2) ** 2 +
        (trapezoid.bottom.y1 - trapezoid.bottom.y2) ** 2
    )
  );
  const area = calculateArea(trapezoid);
  const height = Math.round((2 * area) / (length + bottomLength));
  const angle =
    (Math.atan2(
      trapezoid.top.y2 - trapezoid.top.y1,
      trapezoid.top.x2 - trapezoid.top.x1
    ) +
      Math.atan2(
        trapezoid.bottom.y2 - trapezoid.bottom.y1,
        trapezoid.bottom.x2 - trapezoid.bottom.x1
      )) /
      2 -
    Math.PI / 2;
  const xShift = Math.round(Math.cos(angle) * height);
  const yShift = Math.round(Math.sin(angle) * height);
  return { xShift, yShift };
};
