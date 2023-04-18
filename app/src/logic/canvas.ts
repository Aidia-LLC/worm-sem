import { Trapezoid, Vertex } from "@dto/canvas";
import { ProcessingOptions } from "@dto/ProcessingOptions";
import { edgeFilter } from "./edgeFilter";
import { base64ToImageSrc } from "./image";

export const setupCanvas = async (
  canvas: HTMLCanvasElement,
  options: ProcessingOptions,
  src: string,
  overlayCanvas: HTMLCanvasElement
): Promise<void> => {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const img = new Image();
  let imageData: ImageData;

  return new Promise((resolve) => {
    img.onload = function () {
      if (!ctx) return;
      canvas.width = img.width;
      canvas.height = img.height;
      overlayCanvas.width = img.width;
      overlayCanvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      edgeFilter(canvas, options, imageData, ctx);
      resolve();
    };
    img.onerror = (e) => {
      console.log("IMAGE ERROR", e);
    };
    img.src = base64ToImageSrc(src);
  });
};

export function convertLocalToGlobal(
  trapezoid: Trapezoid,
  x: number,
  y: number
): Trapezoid {
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
  } as Trapezoid;
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
  ctx.lineTo(trapezoid.bottom.x2, trapezoid.bottom.y2);
  ctx.lineTo(trapezoid.bottom.x1, trapezoid.bottom.y1);
  ctx.lineTo(trapezoid.top.x1, trapezoid.top.y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.stroke();
  ctx.closePath();
}

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
  const area1 = Math.sqrt((s - a) * (s - b) * (s - c) * (s - d));

  const a2 = Math.sqrt(
    (trapezoid.top.x1 - trapezoid.top.x2) ** 2 +
      (trapezoid.top.y1 - trapezoid.top.y2) ** 2
  );
  const b2 = Math.sqrt(
    (trapezoid.bottom.x1 - trapezoid.bottom.x2) ** 2 +
      (trapezoid.bottom.y1 - trapezoid.bottom.y2) ** 2
  );
  const c2 = Math.sqrt(
    (trapezoid.left.x1 - trapezoid.left.x2) ** 2 +
      (trapezoid.left.y1 - trapezoid.left.y2) ** 2
  );
  const d2 = Math.sqrt(
    (trapezoid.right.x1 - trapezoid.right.x2) ** 2 +
      (trapezoid.right.y1 - trapezoid.right.y2) ** 2
  );
  // Calculate the semiperimeter of the quadrilateral
  const s2 = (a2 + b2 + c2 + d2) / 2;

  // Calculate the area using Brahmagupta's formula
  const area2 = Math.sqrt((s2 - a2) * (s2 - b2) * (s2 - c2) * (s2 - d2));

  return Math.max(area1, area2);
}

export function findConnectedTrapezoids(
  trapezoid: Trapezoid,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: ProcessingOptions,
  fit: number
) {
  const squareSize = options.squareSize + 10;
  let trapezoids: Trapezoid[] = [];
  const yShift =
    Math.round(
      (trapezoid.top.y1 + trapezoid.top.y2) / 2 -
        (trapezoid.bottom.y1 + trapezoid.bottom.y2) / 2
    ) - 5;
  const xShift = Math.round(
    (trapezoid.top.y1 -
      trapezoid.top.y2 +
      (trapezoid.bottom.y1 - trapezoid.bottom.y2)) /
      2
  );
  recurseSearchTrapezoid(
    x,
    y,
    -xShift,
    yShift,
    trapezoid,
    ctx,
    options,
    trapezoids,
    0,
    squareSize,
    fit
  );
  recurseSearchTrapezoid(
    x,
    y,
    xShift,
    -yShift,
    trapezoid,
    ctx,
    options,
    trapezoids,
    0,
    squareSize,
    fit
  );
  return trapezoids;
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
  fit: number
): Trapezoid[] {
  if (!trapezoid || count > 20) return trapezoids;
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const square = getSquare(imageData, x + deltaX, y + deltaY, squareSize);
  const shiftedTrapezoid = convertLocalToGlobal(trapezoid, deltaX, deltaY);
  const firstTest = FixedDirectSearchOptimization(
    getPointsOnTrapezoid,
    shiftedTrapezoid,
    square,
    options,
    x + deltaX - squareSize / 2,
    y + deltaY - squareSize / 2,
    squareSize
  );
  if (!firstTest) {
    return trapezoids;
  }
  const secondTest = RecurseDirectSearchOptimization(
    getPointsOnTrapezoid,
    firstTest,
    square,
    options,
    x + deltaX - squareSize / 2,
    y + deltaY - squareSize / 2,
    squareSize,
    fit
  );
  if (secondTest) {
    DrawTrapezoid(secondTest, ctx);
    trapezoids.push(secondTest);
    let xShift = Math.round(
      ((trapezoid.top.x1 + trapezoid.top.x2) / 2 +
        (trapezoid.bottom.x1 + trapezoid.bottom.x2) / 2) /
        2 -
        ((secondTest.top.x1 + secondTest.top.x2) / 2 +
          (secondTest.bottom.x1 + secondTest.bottom.x2) / 2) /
          2
    );
    let temp = Math.round(
      (secondTest.top.y1 + secondTest.top.y2) / 2 -
        (secondTest.bottom.y1 + secondTest.bottom.y2) / 2
    );
    let yShift = deltaY < 0 ? temp : -temp;
    const yCenter = Math.round(
      ((secondTest.top.y1 + secondTest.top.y2) / 2 +
        (secondTest.bottom.y1 + secondTest.bottom.y2) / 2) /
        2
    );
    yShift += yCenter - (y + deltaY);

    return recurseSearchTrapezoid(
      x + deltaX,
      y + deltaY,
      -xShift,
      yShift,
      secondTest,
      ctx,
      options,
      trapezoids,
      count + 1,
      squareSize,
      fit
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
): Trapezoid | undefined {
  const areaThreshold = [trapezoidArea * 0.9, trapezoidArea * 1.1];
  const iterations = 25000;
  let bestTrapezoid: Trapezoid | undefined;
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
      (trapezoidArea == 0 && (area < 45 * 45 || area > 60 * 55))
    )
      continue;
    const points = getPointsOnTrapezoid(
      edgePixels,
      convertLocalToGlobal(trapezoid, x, y),
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
  if (bestFt < fit * options.minimumFit) return null;
  return computeTrapezoid(vertices);
}

function computeTrapezoid(vertices: Vertex[]): Trapezoid {
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