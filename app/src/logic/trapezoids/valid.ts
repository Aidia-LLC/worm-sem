import { Trapezoid } from "@dto/canvas";
import { ProcessingOptions } from "@dto/ProcessingOptions";
import { calculateArea } from "@logic/canvas";

export function trapezoidIsValid(
  trapezoid: Trapezoid,
  x: number,
  y: number,
  options: ProcessingOptions,
  fit: number | null
) {
  const { squareSize } = options;
  const area = calculateArea(trapezoid);
  const areaThreshold = squareSize ** 2 * 0.3;
  const areaValid = area > areaThreshold;
  const fitValid = fit && Math.abs(fit) > options.firstFit;
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
    Math.abs(centerPoint.x - x) < 30 && Math.abs(centerPoint.y - y) < 30;
  const valid = areaValid && fitValid && sideValid && centerPointValid;
  // console.log({ area, areaValid, fitValid, sideValid, valid })
  return valid;
}
