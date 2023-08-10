import { ProcessingOptions } from "src/lib/data/ProcessingOptions";
import { TrapezoidalSlice } from "../types";

export function getPointsOnTrapezoid(
  data: Uint8ClampedArray,
  trapezoid: TrapezoidalSlice,
  options: ProcessingOptions,
  xx: number,
  yy: number,
  squareSize?: number
  // ctx?: CanvasRenderingContext2D
): number {
  // Find the actual number of edge pixels in each line
  const lines = [
    trapezoid.top,
    trapezoid.bottom,
    trapezoid.left,
    trapezoid.right,
  ];
  let points = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const xStep = dx / length;
    const yStep = dy / length;
    let x = line.x1 - xx + (squareSize ?? options.squareSize) / 2;
    let y = line.y1 - yy + (squareSize ?? options.squareSize) / 2;
    for (let j = 0; j < length; j++) {
      if (
        !(
          x + xStep * j > 0 &&
          x + xStep * j < (squareSize ?? options.squareSize) &&
          y + yStep * j > 0 &&
          y + yStep * j < (squareSize ?? options.squareSize)
        )
      )
        continue;
      if (
        data[
          Math.round(y + yStep * j) * (squareSize ?? options.squareSize) +
            Math.round(x + xStep * j)
        ] === 255 ||
        data[
          Math.round(y + yStep * j) * (squareSize ?? options.squareSize) +
            Math.round(x + xStep * j + 1)
        ] === 255 ||
        data[
          Math.round(y + yStep * j) * (squareSize ?? options.squareSize) +
            Math.round(x + xStep * j - 1)
        ] === 255 ||
        data[
          Math.round(y + yStep * j + 1) * (squareSize ?? options.squareSize) +
            Math.round(x + xStep * j)
        ] === 255 ||
        data[
          Math.round(y + yStep * j - 1) * (squareSize ?? options.squareSize) +
            Math.round(x + xStep * j)
        ] === 255
      ) {
        points++;
        // if (ctx) {
        //   ctx.beginPath();
        //   ctx.rect(
        //     Math.round(x + xStep * j) + xx - options.squareSize / 2,
        //     Math.round(y + yStep * j) + yy - options.squareSize / 2,
        //     5,
        //     5
        //   );
        //   ctx.strokeStyle = "yellow";
        //   ctx.stroke();
        // }
      }
    }
  }
  return points;
}
