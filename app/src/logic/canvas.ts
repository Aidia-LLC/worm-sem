import { ZoomState } from "@components/RibbonDetector/ZoomController";
import { ProcessingOptions } from "@data/ProcessingOptions";
import { Slice, Trapezoid, Vertex } from "@data/shapes";
import { base64ToImageSrc } from "./image";
import { linesIntersect } from "./intersection";

export const setupCanvases = async (details: {
  primaryCanvas: HTMLCanvasElement;
  canvases: HTMLCanvasElement[];
  src: string;
}): Promise<{
  width: number;
  height: number;
}> => {
  return new Promise((res) => {
    const image = new Image();
    image.onload = () => {
      const ctx = details.primaryCanvas.getContext("2d")!;
      ctx.clearRect(
        0,
        0,
        details.primaryCanvas.width,
        details.primaryCanvas.height
      );
      details.primaryCanvas.width = image.width;
      details.primaryCanvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      details.canvases.forEach((canvas) => {
        canvas.width = image.width;
        canvas.height = image.height;
      });
      res({
        width: image.width,
        height: image.height,
      });
    };
    image.src = base64ToImageSrc(details.src);
  });
};

export function translateTrapezoid(
  trapezoid: Slice,
  x: number,
  y: number
): Slice {
  return {
    top: {
      x1: trapezoid.top.x1 + x,
      y1: trapezoid.top.y1 + y,
      x2: trapezoid.top.x2 + x,
      y2: trapezoid.top.y2 + y,
    },
    bottom: {
      x1: trapezoid.bottom.x1 + x,
      y1: trapezoid.bottom.y1 + y,
      x2: trapezoid.bottom.x2 + x,
      y2: trapezoid.bottom.y2 + y,
    },
    left: {
      x1: trapezoid.left.x1 + x,
      y1: trapezoid.left.y1 + y,
      x2: trapezoid.left.x2 + x,
      y2: trapezoid.left.y2 + y,
    },
    right: {
      x1: trapezoid.right.x1 + x,
      y1: trapezoid.right.y1 + y,
      x2: trapezoid.right.x2 + x,
      y2: trapezoid.right.y2 + y,
    },
    id: trapezoid.id,
  } satisfies Slice;
}

export function DrawTrapezoid(
  trapezoid: Trapezoid,
  ctx: CanvasRenderingContext2D,
  color: string = "green",
  thickness: number = 1
) {
  ctx.beginPath();
  ctx.moveTo(trapezoid.top.x1, trapezoid.top.y1);
  ctx.lineTo(trapezoid.top.x2, trapezoid.top.y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness + 5;
  ctx.stroke();
  ctx.lineTo(trapezoid.bottom.x2, trapezoid.bottom.y2);
  ctx.lineTo(trapezoid.bottom.x1, trapezoid.bottom.y1);
  ctx.lineTo(trapezoid.top.x1, trapezoid.top.y1);
  ctx.lineWidth = thickness;

  ctx.stroke();
  ctx.closePath();
}

const calculateSemiPerimeter = (trapezoid: Trapezoid): number => {
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
  return s;
};

export function calculateArea(trapezoid: Trapezoid): number {
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

const permutator = <T>(input: T[]) => {
  let permArr: T[][] = [],
    usedChars: T[] = [];
  return (function main() {
    for (let i = 0; i < input.length; i++) {
      let ch = input.splice(i, 1)[0];
      usedChars.push(ch);
      if (input.length == 0) {
        permArr.push(usedChars.slice());
      }
      main();
      input.splice(i, 0, ch);
      usedChars.pop();
    }
    return permArr;
  })();
};

export const permuteTrapezoid = (trapezoid: Slice) => {
  const points: [number, number][] = [
    [trapezoid.top.x1, trapezoid.top.y1],
    [trapezoid.top.x2, trapezoid.top.y2],
    [trapezoid.bottom.x1, trapezoid.bottom.y1],
    [trapezoid.bottom.x2, trapezoid.bottom.y2],
  ];
  const permutations = permutator(points);
  const trapezoids: Slice[] = permutations.map((permutation) => {
    return {
      id: trapezoid.id,
      top: {
        x1: permutation[0][0],
        y1: permutation[0][1],
        x2: permutation[1][0],
        y2: permutation[1][1],
      },
      bottom: {
        x1: permutation[2][0],
        y1: permutation[2][1],
        x2: permutation[3][0],
        y2: permutation[3][1],
      },
      left: {
        x1: permutation[0][0],
        y1: permutation[0][1],
        x2: permutation[2][0],
        y2: permutation[2][1],
      },
      right: {
        x1: permutation[1][0],
        y1: permutation[1][1],
        x2: permutation[3][0],
        y2: permutation[3][1],
      },
    } as Slice;
  });
  const data = trapezoids
    .filter((t) => t.top.x1 < t.top.x2 && t.bottom.x1 < t.bottom.x2)
    .filter(
      (t) =>
        !linesIntersect(
          [
            [t.top.x1, t.top.y1],
            [t.top.x2, t.top.y2],
          ],
          [
            [t.bottom.x1, t.bottom.y1],
            [t.bottom.x2, t.bottom.y2],
          ]
        ) &&
        !linesIntersect(
          [
            [t.left.x1, t.left.y1],
            [t.left.x2, t.left.y2],
          ],
          [
            [t.right.x1, t.right.y1],
            [t.right.x2, t.right.y2],
          ]
        )
    )
    .filter((t) => {
      const top = Math.sqrt(
        (t.top.x1 - t.top.x2) ** 2 + (t.top.y1 - t.top.y2) ** 2
      );
      const bottom = Math.sqrt(
        (t.bottom.x1 - t.bottom.x2) ** 2 + (t.bottom.y1 - t.bottom.y2) ** 2
      );
      const left = Math.sqrt(
        (t.left.x1 - t.left.x2) ** 2 + (t.left.y1 - t.left.y2) ** 2
      );
      const right = Math.sqrt(
        (t.right.x1 - t.right.x2) ** 2 + (t.right.y1 - t.right.y2) ** 2
      );
      const max = Math.max(top, bottom, left, right);
      return bottom === max;
    })
    .map((t) => ({
      trapezoid: t,
      area: calculateArea(t),
      semiPerimeter: calculateSemiPerimeter(t),
    }));
  const maxArea = Math.max(...data.map((d) => d.area));
  const d = data.find((d) => d.area === maxArea);
  if (!d) return trapezoid;
  return d.trapezoid;
};

const getXYShift = (trapezoid: Slice) => {
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

export function findConnectedTrapezoids(
  trapezoid: Slice,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: ProcessingOptions,
  fit: number
) {
  const squareSize = options.squareSize + 10;
  let trapezoids: Slice[] = [];
  const { xShift, yShift } = getXYShift(trapezoid);
  recurseSearchTrapezoid(
    x,
    y,
    xShift,
    yShift,
    { ...trapezoid },
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
  ctx: CanvasRenderingContext2D,
  options: ProcessingOptions,
  trapezoids: Trapezoid[],
  count: number,
  squareSize: number,
  fit: number,
  up: boolean
): Trapezoid[] {
  if (!trapezoid || count > 15) return trapezoids;
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const square = getSquare(imageData, x + deltaX, y + deltaY, squareSize);
  const shiftedTrapezoid = translateTrapezoid(trapezoid, deltaX, deltaY);
  // DrawTrapezoid(shiftedTrapezoid, ctx, "yellow", 5 * (count + 2));
  const firstTest = FixedDirectSearchOptimization(
    getPointsOnTrapezoid,
    { ...shiftedTrapezoid },
    square,
    options,
    x + deltaX - squareSize / 2,
    y + deltaY - squareSize / 2,
    squareSize
  );
  if (!firstTest) {
    return trapezoids;
  }
  // DrawTrapezoid(firstTest, ctx, "blue", 5 * (count + 2));
  const secondTest = RecurseDirectSearchOptimization(
    getPointsOnTrapezoid,
    { ...firstTest },
    square,
    options,
    x + deltaX - squareSize / 2,
    y + deltaY - squareSize / 2,
    squareSize,
    fit
  );
  if (secondTest) {
    // DrawTrapezoid(secondTest, ctx, "green", 5 * (count + 2));
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

export function getPointsOnTrapezoid(
  data: Uint8ClampedArray,
  trapezoid: Trapezoid,
  options: ProcessingOptions,
  xx: number,
  yy: number,
  squareSize?: number
): number {
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
    let x = line.x1 - xx;
    let y = line.y1 - yy;
    for (let j = 0; j < length; j++) {
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
      }
    }
  }
  return points;
}

export function RANSAC(
  edgePixels: Uint8ClampedArray,
  trapezoidArea: number,
  options: ProcessingOptions,
  x: number,
  y: number,
  squareSize?: number
): Slice | undefined {
  const areaThreshold = [trapezoidArea * 0.9, trapezoidArea * 1.1];
  const iterations = 25000;
  const size = squareSize ?? options.squareSize;
  let bestTrapezoid: Slice | undefined;
  let bestFit: number | undefined;
  for (let i = 0; i < iterations; i++) {
    const sample: Vertex[] = getSemiRandomSample(
      4,
      squareSize ?? options.squareSize
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
      translateTrapezoid(trapezoid, x, y),
      options,
      x,
      y,
      squareSize
    );
    if (points && (!bestFit || points > bestFit)) {
      bestTrapezoid = trapezoid;
      bestFit = points;
    }
  }
  return bestTrapezoid;
}

function getSemiRandomSample<Vertex>(size: number, width: number): Vertex[] {
  const sample: Vertex[] = [];

  const randomNumbers: number[] = [];
  for (let i = 0; i < size; i++) {
    randomNumbers.push(Math.floor(Math.random() * (width / 2)));
    randomNumbers.push(Math.floor(Math.random() * (width / 2)));
  }

  sample.push({ x: randomNumbers[0], y: randomNumbers[1] } as Vertex);
  sample.push({
    x: randomNumbers[2] + width / 2,
    y: randomNumbers[3],
  } as Vertex);
  sample.push({
    x: randomNumbers[4],
    y: randomNumbers[5] + width / 2,
  } as Vertex);
  sample.push({
    x: randomNumbers[6] + width / 2,
    y: randomNumbers[7] + width / 2,
  } as Vertex);

  return sample;
}

export function DirectSearchOptimization(
  ft: (
    data: Uint8ClampedArray,
    trapezoid: Trapezoid,
    options: ProcessingOptions,
    x: number,
    y: number,
    squareSize?: number
  ) => number,
  trapezoid: Trapezoid,
  data: Uint8ClampedArray,
  options: ProcessingOptions,
  x: number,
  y: number,
  squareSize?: number
) {
  // Move each vertex in trapezoid by 5 pixels in 16 directions, take the best one
  let vertices: Vertex[] = [
    { x: trapezoid.top.x1, y: trapezoid.top.y1 },
    { x: trapezoid.top.x2, y: trapezoid.top.y2 },
    { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 },
    { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 },
  ];
  let bestFt: number = ft(data, trapezoid, options, x, y, squareSize);
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
          newVertex.x < x ||
          newVertex.x >= (squareSize ?? options.squareSize) + x ||
          newVertex.y < y ||
          newVertex.y >= (squareSize ?? options.squareSize) + y
        ) {
          continue;
        }
        const newTrapezoid = computeTrapezoid(
          vertices.map((v, index) =>
            index === i ? newVertex : { x: Math.round(v.x), y: Math.round(v.y) }
          )
        );

        const newFt = ft(data, newTrapezoid, options, x, y, squareSize);
        if (bestFt === undefined || newFt > bestFt) {
          bestFt = newFt;
          bestVertex = newVertex;
        }
      }
      if (bestVertex) {
        vertices = vertices.map((v, index) =>
          index === i
            ? (bestVertex as Vertex)
            : { x: Math.round(v.x), y: Math.round(v.y) }
        );
      }
    }
  }
  return { trapezoid: computeTrapezoid(vertices), fit: bestFt };
}

function FixedDirectSearchOptimization(
  ft: (
    data: Uint8ClampedArray,
    trapezoid: Trapezoid,
    options: ProcessingOptions,
    x: number,
    y: number,
    squareSize?: number
  ) => number,
  trapezoid: Trapezoid,
  data: Uint8ClampedArray,
  options: ProcessingOptions,
  x: number,
  y: number,
  squareSize: number
) {
  let vertices = [
    { x: trapezoid.top.x1, y: trapezoid.top.y1 },
    { x: trapezoid.top.x2, y: trapezoid.top.y2 },
    { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 },
    { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 },
  ];
  let bestFt: number = ft(data, trapezoid, options, x, y, squareSize);
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
          const rotatedT: Trapezoid = computeTrapezoid(rotatedVertices);
          const newFt = ft(data, rotatedT, options, x, y, squareSize);
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
    trapezoid: Trapezoid,
    options: ProcessingOptions,
    x: number,
    y: number,
    squareSize?: number
  ) => number,
  trapezoid: Trapezoid,
  data: Uint8ClampedArray,
  options: ProcessingOptions,
  x: number,
  y: number,
  squareSize: number,
  fit: number
) {
  // Move each vertex in trapezoid by 5 pixels in 16 directions, take the best one
  let vertices = [
    { x: trapezoid.top.x1, y: trapezoid.top.y1 },
    { x: trapezoid.top.x2, y: trapezoid.top.y2 },
    { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 },
    { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 },
  ];
  let bestFt: number = ft(data, trapezoid, options, x, y, squareSize);
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
        const newFt = ft(data, newTrapezoid, options, x, y, squareSize);
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
  console.log(bestFt, fit, options.minimumFit);
  if (bestFt < fit * options.minimumFit) return null;
  return computeTrapezoid(vertices);
}

function computeTrapezoid(vertices: Vertex[]): Slice {
  const pairs = [
    [vertices[0], vertices[1]],
    [vertices[1], vertices[3]],
    [vertices[3], vertices[2]],
    [vertices[2], vertices[0]],
    [vertices[3], vertices[0]],
    [vertices[2], vertices[1]],
  ];
  let shortestEdge: any | undefined;
  let shortestEdgeLength: number | undefined;
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const dx = pair[1].x - pair[0].x;
    const dy = pair[1].y - pair[0].y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (shortestEdgeLength === undefined || length < shortestEdgeLength) {
      shortestEdgeLength = length;
      shortestEdge = pair;
    }
  }
  let bottomLeft = shortestEdge[0];
  let bottomRight = shortestEdge[1];
  if (bottomLeft.x > bottomRight.x) {
    const temp = bottomLeft;
    bottomLeft = bottomRight;
    bottomRight = temp;
  }
  let topRight = vertices.find(
    (v) => v !== bottomLeft && v !== bottomRight
  ) as Vertex;
  let topLeft = vertices.find(
    (v) => v !== bottomLeft && v !== bottomRight && v !== topRight
  ) as Vertex;
  if (topRight.x < topLeft.x) {
    const temp = topRight;
    topRight = topLeft;
    topLeft = temp;
  }
  if (topLeft.y > bottomLeft.y) {
    let temp = topLeft;
    topLeft = bottomLeft;
    bottomLeft = temp;
    temp = topRight;
    topRight = bottomRight;
    bottomRight = temp;
  }
  return {
    top: { x1: topLeft.x, y1: topLeft.y, x2: topRight.x, y2: topRight.y },
    bottom: {
      x1: bottomLeft.x,
      y1: bottomLeft.y,
      x2: bottomRight.x,
      y2: bottomRight.y,
    },
    left: { x1: topLeft.x, y1: topLeft.y, x2: bottomLeft.x, y2: bottomLeft.y },
    right: {
      x1: topRight.x,
      y1: topRight.y,
      x2: bottomRight.x,
      y2: bottomRight.y,
    },
    id: Math.floor(Math.random() * 100000000),
  };
}

export function getSquare(
  fullImage: ImageData,
  x: number,
  y: number,
  size: number
) {
  const square: number[] = [];
  const imageData = fullImage.data;
  const width = fullImage.width;
  const height = fullImage.height;
  const startX = Math.max(0, x - size / 2);
  const startY = Math.max(0, y - size / 2);
  const endX = Math.min(width, x + size / 2);
  const endY = Math.min(height, y + size / 2);
  for (let j = startY; j < endY; j += 1) {
    for (let i = startX; i < endX; i += 1) {
      const pixelIndex = (j * width + i) * 4;
      square.push(imageData[pixelIndex]);
    }
  }
  return square as unknown as Uint8ClampedArray;
}

export const convertZoomedCoordinatesToFullImage = (
  x: number,
  y: number,
  zoom: ZoomState,
  width: number,
  height: number
) => {
  if (zoom.status !== "zoomed-in") return { x, y };

  const viewportWidth = width / zoom.scale;
  const viewportHeight = height / zoom.scale;

  const percentX = x / width;
  const percentY = y / height;

  const clickedX = lerp(
    zoom.x - viewportWidth / 2,
    zoom.x + viewportWidth / 2,
    percentX
  );
  const clickedY = lerp(
    zoom.y - viewportHeight / 2,
    zoom.y + viewportHeight / 2,
    percentY
  );

  return { x: clickedX, y: clickedY };
};

export const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;
