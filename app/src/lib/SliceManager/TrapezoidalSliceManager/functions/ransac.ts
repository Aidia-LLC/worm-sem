import { ProcessingOptions } from "src/lib/data/ProcessingOptions";
import { TrapezoidalSlice, Vertex } from "../types";
import { calculateArea } from "./calculateArea";
import { computeTrapezoid } from "./computeTrapezoid";
import { getPointsOnTrapezoid } from "./getPointsOnTrapezoid";
import { translateSlice } from "./translateSlice";

const MAX_ITERATIONS = 75_000;

export function RANSAC(
  edgePixels: Uint8ClampedArray,
  trapezoidArea: number,
  options: ProcessingOptions,
  x: number,
  y: number,
  squareSize?: number,
  vertices?: Vertex[]
): TrapezoidalSlice | undefined {
  console.log("RANSAC", vertices);
  const areaThreshold = [trapezoidArea * 0.9, trapezoidArea * 1.1];
  const iterations = MAX_ITERATIONS;
  const size = squareSize ?? options.squareSize;
  let bestTrapezoid: TrapezoidalSlice | undefined;
  let bestFit: number | undefined;
  for (let i = 0; i < iterations; i++) {
    const sample: Vertex[] = getSemiRandomSample(
      4,
      squareSize ?? options.squareSize,
      vertices
    );
    // If sample not within 20% of area, continue
    const trapezoid = computeTrapezoid(sample);
    const area = calculateArea(trapezoid);
    if (
      (trapezoidArea !== 0 &&
        (area < areaThreshold[0] || area > areaThreshold[1])) ||
      (trapezoidArea == 0 &&
        (area < (size * 0.5) ** 2 || area > (size * 0.9) ** 2))
    )
      continue;
    const points = getPointsOnTrapezoid(
      edgePixels,
      translateSlice({
        slice: trapezoid,
        dx: x,
        dy: y,
      }),
      options,
      x + size / 2,
      y + size / 2,
      squareSize
    );
    if (points && (!bestFit || points > bestFit)) {
      bestTrapezoid = trapezoid;
      bestFit = points;
    }
  }
  return bestTrapezoid;
}

function getSemiRandomSample<Vertex>(
  size: number,
  width: number,
  startingPoints?: Vertex[]
): Vertex[] {
  const sample: Vertex[] = [...(startingPoints ?? [])];

  const randomNumbers: number[] = [];
  for (let i = 0; i < size; i++) {
    randomNumbers.push(Math.floor(Math.random() * (width / 2)));
    randomNumbers.push(Math.floor(Math.random() * (width / 2)));
  }
  const topLeft = sample.filter(
    (p: any) => p.x < width / 2 && p.y < width / 2
  )?.[0];
  const topRight = sample.filter(
    (p: any) => p.x > width / 2 && p.y < width / 2
  )?.[0];
  const bottomLeft = sample.filter(
    (p: any) => p.x < width / 2 && p.y > width / 2
  )?.[0];
  const bottomRight = sample.filter(
    (p: any) => p.x > width / 2 && p.y > width / 2
  )?.[0];
  //push a point
  if (!topLeft) {
    sample.push({ x: randomNumbers[0], y: randomNumbers[1] } as Vertex);
  }
  if (!topRight) {
    sample.push({
      x: randomNumbers[2] + width / 2,
      y: randomNumbers[3],
    } as Vertex);
  }
  if (!bottomLeft) {
    sample.push({
      x: randomNumbers[4],
      y: randomNumbers[5] + width / 2,
    } as Vertex);
  }
  if (!bottomRight) {
    sample.push({
      x: randomNumbers[6] + width / 2,
      y: randomNumbers[7] + width / 2,
    } as Vertex);
  }

  return sample;
}
