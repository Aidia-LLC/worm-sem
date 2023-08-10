import { ProcessingOptions } from "src/lib/data/ProcessingOptions";
import { TrapezoidalSlice } from "../types";
import { calculateAngles } from "./calculateAngles";
import { calculateArea } from "./calculateArea";

export function isTrapezoidValid(
  trapezoid: TrapezoidalSlice,
  x: number,
  y: number,
  options: ProcessingOptions,
  fit: number | null
) {
  const angles = calculateAngles(trapezoid);
  const { squareSize } = options;
  const area = calculateArea(trapezoid);
  const areaThreshold = squareSize ** 2 * 0.25;
  const areaValid = area > areaThreshold;
  const fitValid = fit && Math.abs(fit) > options.squareSize / 2;
  // make sure each side is at least 1/3 of the square size
  const sideThresh = squareSize / 6;
  const top = Math.sqrt(
    (trapezoid.top.x1 - trapezoid.top.x2) ** 2 +
      (trapezoid.top.y1 - trapezoid.top.y2) ** 2
  );
  const bottom = Math.sqrt(
    (trapezoid.bottom.x1 - trapezoid.bottom.x2) ** 2 +
      (trapezoid.bottom.y1 - trapezoid.bottom.y2) ** 2
  );
  const left = Math.sqrt(
    (trapezoid.left.x1 - trapezoid.left.x2) ** 2 +
      (trapezoid.left.y1 - trapezoid.left.y2) ** 2
  );
  const right = Math.sqrt(
    (trapezoid.right.x1 - trapezoid.right.x2) ** 2 +
      (trapezoid.right.y1 - trapezoid.right.y2) ** 2
  );
  const sideValid =
    top > sideThresh &&
    bottom > sideThresh &&
    left > sideThresh &&
    right > sideThresh;
  const centerPoint = {
    x:
      ((trapezoid.top.x1 + trapezoid.top.x2) / 2 +
        (trapezoid.bottom.x1 + trapezoid.bottom.x2) / 2) /
      2,
    y:
      ((trapezoid.top.y1 + trapezoid.top.y2) / 2 +
        (trapezoid.bottom.y1 + trapezoid.bottom.y2) / 2) /
      2,
  };
  const centerPointValid =
    Math.abs(centerPoint.x - x) < 80 && Math.abs(centerPoint.y - y) < 80;
  const valid =
    areaValid && fitValid && sideValid && centerPointValid && angles;
  return valid;
}
