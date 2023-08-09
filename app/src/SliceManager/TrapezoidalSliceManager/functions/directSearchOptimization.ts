import { ProcessingOptions } from "@data/ProcessingOptions";
import { TrapezoidalSlice, Vertex } from "../types";
import { computeTrapezoid } from "./computeTrapezoid";

export const directSearchOptimization = (
  ft: (
    data: Uint8ClampedArray,
    trapezoid: TrapezoidalSlice,
    options: ProcessingOptions,
    x: number,
    y: number,
    squareSize?: number,
    ctx?: CanvasRenderingContext2D
  ) => number,
  trapezoid: TrapezoidalSlice,
  data: Uint8ClampedArray,
  options: ProcessingOptions,
  x: number,
  y: number,
  squareSize?: number,
  ctx?: CanvasRenderingContext2D
) => {
  // Move each vertex in trapezoid by 5 pixels in 16 directions, take the best one
  let vertices: Vertex[] = [
    { x: trapezoid.top.x1, y: trapezoid.top.y1 },
    { x: trapezoid.top.x2, y: trapezoid.top.y2 },
    { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 },
    { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 },
  ];
  let bestFt: number = ft(data, trapezoid, options, x, y, squareSize, ctx);
  console.log("DirectSearchOptimization", bestFt);
  for (let k = 0; k < 27; k++) {
    for (let i = 0; i < vertices.length; i++) {
      let bestVertex: Vertex | undefined;
      const vertex = vertices[i];
      for (let j = 0; j < 16; j++) {
        const direction = (j * Math.PI) / 8;
        const dx = Math.cos(direction) * (((k % 6) + 1) * 2);
        const dy = Math.sin(direction) * (((k % 6) + 1) * 2);
        const newVertex: Vertex = {
          x: Math.round(vertex.x + dx),
          y: Math.round(vertex.y + dy),
        };
        if (
          newVertex.x < x - (squareSize ?? options.squareSize) / 2 ||
          newVertex.x >= (squareSize ?? options.squareSize) / 2 + x ||
          newVertex.y < y - (squareSize ?? options.squareSize) / 2 ||
          newVertex.y >= (squareSize ?? options.squareSize) / 2 + y
        ) {
          continue;
        }
        const newTrapezoid = computeTrapezoid(
          vertices.map((v, index) =>
            index === i ? newVertex : { x: Math.round(v.x), y: Math.round(v.y) }
          )
        );

        const newFt = ft(data, newTrapezoid, options, x, y, squareSize, ctx);
        if (bestFt === undefined || newFt > bestFt) {
          console.log({ newFt, bestFt });
          bestFt = newFt;
          bestVertex = newVertex;
        }
      }
      if (bestVertex) {
        console.log({ bestVertex });
        vertices = vertices.map((v, index) =>
          index === i
            ? (bestVertex as Vertex)
            : { x: Math.round(v.x), y: Math.round(v.y) }
        );
      }
    }
  }
  return { trapezoid: computeTrapezoid(vertices), fit: bestFt };
};
