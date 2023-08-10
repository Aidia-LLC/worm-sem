import { ProcessingOptions } from "src/lib/data/ProcessingOptions";
import { TrapezoidalSlice, Vertex } from "../types";
import { computeTrapezoid } from "./computeTrapezoid";
import { getPointsOnTrapezoid } from "./getPointsOnTrapezoid";
import { getSquare } from "./getSquare";
import { getXYShift } from "./getXYShift";
import { permuteTrapezoid } from "./permuteTrapezoid";
import { translateSlice } from "./translateSlice";

export function findConnectedTrapezoids(
  trapezoid: TrapezoidalSlice,
  edgeData: ImageData,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: ProcessingOptions,
  fit: number
) {
  const squareSize = options.squareSize + 10;
  let trapezoids: TrapezoidalSlice[] = [];
  const { xShift, yShift } = getXYShift(trapezoid);
  recurseSearchTrapezoid(
    x,
    y,
    xShift,
    yShift,
    { ...trapezoid },
    edgeData,
    ctx,
    options,
    trapezoids,
    0,
    squareSize,
    fit,
    true
  );
  recurseSearchTrapezoid(
    x,
    y,
    -xShift,
    -yShift,
    { ...trapezoid },
    edgeData,
    ctx,
    options,
    trapezoids,
    0,
    squareSize,
    fit,
    false
  );
  return trapezoids.map((t) => permuteTrapezoid(t));
}

function recurseSearchTrapezoid(
  x: number,
  y: number,
  deltaX: number,
  deltaY: number,
  trapezoid: any,
  edgeData: ImageData,
  ctx: CanvasRenderingContext2D,
  options: ProcessingOptions,
  trapezoids: TrapezoidalSlice[],
  count: number,
  squareSize: number,
  fit: number,
  up: boolean
): TrapezoidalSlice[] {
  if (!trapezoid || count > 15) return trapezoids;
  const square = getSquare(edgeData, x + deltaX, y + deltaY, squareSize);
  const shiftedTrapezoid = translateSlice({
    slice: trapezoid,
    dx: deltaX,
    dy: deltaY,
  });
  // drawTrapezoid(shiftedTrapezoid, ctx, "yellow", 5 * (count + 2));
  const firstTest = FixedDirectSearchOptimization(
    getPointsOnTrapezoid,
    { ...shiftedTrapezoid },
    square,
    options,
    x + deltaX,
    y + deltaY,
    squareSize
  );
  if (!firstTest) {
    return trapezoids;
  }
  // drawTrapezoid(firstTest, ctx, "blue", 8);
  const secondTest = RecurseDirectSearchOptimization(
    getPointsOnTrapezoid,
    { ...firstTest },
    square,
    options,
    x + deltaX - squareSize / 2,
    y + deltaY - squareSize / 2,
    squareSize
  );
  if (secondTest) {
    // drawTrapezoid(secondTest, ctx, "green", 5 * (count + 2));
    trapezoids.push(secondTest);
    let { xShift, yShift } = getXYShift(permuteTrapezoid({ ...secondTest })!);
    yShift = up ? yShift : -yShift;
    xShift = up ? xShift : -xShift;
    return recurseSearchTrapezoid(
      x + deltaX,
      y + deltaY,
      xShift,
      yShift,
      { ...secondTest },
      edgeData,
      ctx,
      options,
      trapezoids,
      count + 1,
      squareSize,
      fit,
      up
    );
  }
  return trapezoids;
}

function FixedDirectSearchOptimization(
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
  squareSize: number,
  ctx?: CanvasRenderingContext2D
) {
  let vertices = [
    { x: trapezoid.top.x1, y: trapezoid.top.y1 },
    { x: trapezoid.top.x2, y: trapezoid.top.y2 },
    { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 },
    { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 },
  ];
  let bestFt: number = ft(data, trapezoid, options, x, y, squareSize, ctx);
  for (let k = 0; k < 9; k++) {
    let bestVertices: Vertex[] | undefined;
    for (let j = 0; j < 16; j++) {
      const direction = (j * Math.PI) / 8;
      const dx = Math.cos(direction) * (((k % 8) + 1) * 1);
      const dy = Math.sin(direction) * (((k % 8) + 1) * 1);
      const shiftedVertices: Vertex[] = vertices.map((v) => ({
        x: v.x + dx,
        y: v.y + dy,
      }));
      for (let k = 0; k < 2; k++) {
        for (let j = 0; j < 10; j++) {
          let angle = (j * Math.PI) / 180;
          if (k === 1) {
            angle = -angle;
          }
          const rotatedVertices: Vertex[] = shiftedVertices.map((v) => ({
            x:
              Math.round(
                (v.x - x) * Math.cos(angle) - (v.y - y) * Math.sin(angle)
              ) + x,
            y:
              Math.round(
                (v.x - x) * Math.sin(angle) + (v.y - y) * Math.cos(angle)
              ) + y,
          }));
          const rotatedT: TrapezoidalSlice = computeTrapezoid(rotatedVertices);
          const newFt = ft(data, rotatedT, options, x, y, squareSize, ctx);
          if (bestFt === undefined || newFt > bestFt) {
            bestFt = newFt;
            bestVertices = rotatedVertices;
          }
        }
      }
      if (bestVertices) {
        vertices = bestVertices;
      }
    }
    if (bestVertices) {
      vertices = bestVertices;
    }
  }
  return computeTrapezoid(vertices);
}

function RecurseDirectSearchOptimization(
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
  squareSize: number,
  ctx?: CanvasRenderingContext2D
) {
  console.log("recurse");
  // Move each vertex in trapezoid by 5 pixels in 16 directions, take the best one
  let vertices = [
    { x: trapezoid.top.x1, y: trapezoid.top.y1 },
    { x: trapezoid.top.x2, y: trapezoid.top.y2 },
    { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 },
    { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 },
  ];
  let bestFt: number = ft(data, trapezoid, options, x, y, squareSize, ctx);
  for (let k = 0; k < 16; k++) {
    for (let i = 0; i < vertices.length; i++) {
      let bestVertex: Vertex | undefined;
      const vertex = vertices[i];
      for (let j = 0; j < 16; j++) {
        const direction = (j * Math.PI) / 8;
        const dx = Math.cos(direction) * (((k % 3) + 1) * 1);
        const dy = Math.sin(direction) * (((k % 3) + 1) * 1);
        const newVertex: Vertex = {
          x: Math.round(vertex.x + dx),
          y: Math.round(vertex.y + dy),
        };
        if (
          newVertex.x < x ||
          newVertex.x >= x + squareSize ||
          newVertex.y < y ||
          newVertex.y >= y + squareSize
        ) {
          continue;
        }
        const newTrapezoid = computeTrapezoid(
          vertices.map((v, index) =>
            index === i ? newVertex : { x: Math.round(v.x), y: Math.round(v.y) }
          )
        );
        const newFt = ft(
          data,
          newTrapezoid,
          options,
          x + squareSize / 2,
          y + squareSize / 2,
          squareSize,
          ctx
        );
        if (bestFt === undefined || newFt > bestFt) {
          bestFt = newFt;
          bestVertex = newVertex;
        }
      }
      if (bestVertex) {
        // @ts-ignore
        vertices = vertices.map((v, index) =>
          index === i ? bestVertex : { x: Math.round(v.x), y: Math.round(v.y) }
        );
      }
    }
  }
  if (bestFt < options.squareSize / 2) return null;
  return computeTrapezoid(vertices);
}
