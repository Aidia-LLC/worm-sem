import { ProcessingOptions } from "@data/ProcessingOptions";
import { LineSegment, TrapezoidalSlice, Vertex } from "../types";
import { directSearchOptimization } from "./directSearchOptimization";
import { getPointsOnTrapezoid } from "./getPointsOnTrapezoid";
import { permuteTrapezoid } from "./permuteTrapezoid";
import { validateTrapezoid } from "./validateTrapezoid";

export function detectTrapezoid({
  x,
  y,
  imageData,
  ctx,
  options,
}: {
  x: number;
  y: number;
  imageData: ImageData;
  ctx: CanvasRenderingContext2D | null | undefined;
  options: ProcessingOptions;
}) {
  if (ctx) {
    ctx.lineWidth = 8;
    // draw imageData
    ctx.putImageData(imageData, 0, 0);
  }

  const square = getSquare(imageData, x, y, options.squareSize);

  const lines = hough(square, options);

  const goodLines = Merge(lines, options);

  const shortLines = ShortenLines(goodLines, square, options);
  console.log("shortLines", shortLines);

  const vertices = computeVertices(shortLines, options, goodLines).map(
    (vertex) => ({
      x: vertex.x + x - options.squareSize / 2,
      y: vertex.y + y - options.squareSize / 2,
    })
  );

  //draw vertices
  if (ctx) {
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 5;
    for (let i = 0; i < vertices.length; i++) {
      const vertex = vertices[i];
      ctx.beginPath();
      ctx.arc(vertex.x, vertex.y, 10, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }
  let trapezoid: TrapezoidalSlice | null = null;
  if (vertices.length === 4) {
    trapezoid = computeTrapezoid(vertices);
  } else if (vertices.length < 4) {
    return { trapezoid: null, fit: null, vertices };
  } else {
    // go through each combination of 4 vertices and find the best trapezoid, using getPointsOnTrapezoid
    const combinations = Combinations(vertices, 4);
    let bestFit = 0;
    for (const combination of combinations) {
      const newTrapezoid = computeTrapezoid(combination);
      if (!newTrapezoid) continue;
      const fit = getPointsOnTrapezoid({
        data: square,
        trapezoid: newTrapezoid,
        options,
        x,
        y,
      });
      const valid = validateTrapezoid({
        trapezoid: newTrapezoid,
        x,
        y,
        options,
        fit,
      });
      if (valid && fit > bestFit) {
        bestFit = fit;
        trapezoid = newTrapezoid;
      }
    }
  }
  if (!trapezoid) {
    return { trapezoid: null, fit: null, vertices: vertices.slice(0, 2) };
  }
  // drawTrapezoid(trapezoid, ctx, "yellow", 15);

  const { trapezoid: newTrapezoid, fit } = directSearchOptimization({
    optimizationFn: getPointsOnTrapezoid,
    trapezoid,
    data: square,
    options,
    x,
    y,
    squareSize: options.squareSize,
  });

  if (!newTrapezoid)
    return { trapezoid: null, fit: null, vertices: vertices.slice(0, 2) };
  // drawTrapezoid(newTrapezoid, ctx, "yellow", 15);
  console.log("trapezoid", newTrapezoid);

  return { trapezoid: permuteTrapezoid(newTrapezoid), fit };
}

function Combinations<T>(array: T[], size: number): T[][] {
  if (size === 1) return array.map((item) => [item]);
  const combinations: T[][] = [];
  for (let i = 0; i < array.length - size + 1; i += 1) {
    const first = array[i];
    const rest = Combinations(array.slice(i + 1), size - 1);
    for (const combination of rest) {
      combinations.push([first, ...combination]);
    }
  }
  return combinations;
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

interface IHoughLine {
  theta: number;
  r: number;
}

export function hough(
  data: Uint8ClampedArray,
  options: ProcessingOptions,
  thetaStep = Math.PI / 180
): LineSegment[] {
  // Calculate the maximum possible distance in the image
  const width = options.squareSize;
  const height = options.squareSize;
  const maxDistance = Math.ceil(Math.sqrt(width * width + height * height));

  // Create an accumulator array
  const accumulator: number[][] = [];
  for (let i = 0; i < 180 / thetaStep; i++) {
    accumulator.push(new Array(maxDistance * 2).fill(0));
  }

  // Iterate over all edge pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const edgeValue = data[i];

      // Only consider edge pixels with non-zero values
      if (edgeValue > 0) {
        for (let theta = 0; theta < 180; theta += thetaStep) {
          const r = Math.round(x * Math.cos(theta) + y * Math.sin(theta));

          // Increment the accumulator cell corresponding to this (theta, r) pair twice
          accumulator[Math.floor(theta / thetaStep)][r + maxDistance] += 1;
          // Increment neighboring cells of the accumulator cell corresponding to this (theta, r) pair once
          accumulator[Math.floor(theta / thetaStep)][r + maxDistance + 1] += 1;
          accumulator[Math.floor(theta / thetaStep)][r + maxDistance - 1] += 1;
          if (Math.floor(theta / thetaStep) < 180)
            accumulator[Math.floor(theta / thetaStep) + 1][
              r + maxDistance
            ] += 1;
          if (Math.floor(theta / thetaStep) > 0)
            accumulator[Math.floor(theta / thetaStep) - 1][
              r + maxDistance
            ] += 1;
        }
      }
    }
  }

  // Find the max votes, then keep lines above 50% of that
  const lines: IHoughLine[] = [];
  let maxVotes = 0;
  for (let theta = 0; theta < 180; theta += thetaStep) {
    for (let r = 0; r < maxDistance * 2; r++) {
      const votes = accumulator[Math.floor(theta / thetaStep)][r];
      if (votes > maxVotes) maxVotes = votes;
    }
  }
  const threshold = maxVotes * options.houghVoteThreshold;
  for (let theta = 0; theta < 180; theta += thetaStep) {
    for (let r = 0; r < maxDistance * 2; r++) {
      const votes = accumulator[Math.floor(theta / thetaStep)][r];
      if (votes > threshold) {
        // check neighboring cells of accumulator; if one is higher, skip
        let skip = false;
        for (let i = -2; i <= 2; i++) {
          for (let j = -2; j <= 2; j++) {
            if (
              accumulator[Math.floor(theta / thetaStep) + i] &&
              accumulator[Math.floor(theta / thetaStep) + i][r + j] &&
              accumulator[Math.floor(theta / thetaStep) + i][r + j] > votes
            ) {
              skip = true;
            }
          }
        }
        if (skip) continue;
        lines.push({ theta, r: r - maxDistance });
      }
    }
  }
  return CartesionLines(lines, width, height);
}

function CartesionLines(
  lines: IHoughLine[],
  width: number,
  height: number
): LineSegment[] {
  const cartesionLines: LineSegment[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const theta = line.theta;
    const r = line.r;
    // See if starting point is on the left edge
    let x1 = 0;
    let y1 = (r - x1 * Math.cos(theta)) / Math.sin(theta);
    if (y1 < 0 || y1 > height) {
      // If not, see if starting point is on the top edge
      y1 = 0;
      x1 = (r - y1 * Math.sin(theta)) / Math.cos(theta);
      if (x1 < 0 || x1 > width) {
        // If not, see if starting point is on the bottom edge
        y1 = height;
        x1 = (r - y1 * Math.sin(theta)) / Math.cos(theta);
      }
    }
    // See if ending point is on the right edge
    let x2 = width;
    let y2 = (r - x2 * Math.cos(theta)) / Math.sin(theta);
    if (y2 < 0 || y2 > height) {
      // If not, see if ending point is on the bottom edge
      y2 = height;
      x2 = (r - y2 * Math.sin(theta)) / Math.cos(theta);
      if (x2 < 0 || x2 > width) {
        // If not, see if ending point is on the top edge
        y2 = 0;
        x2 = (r - y2 * Math.sin(theta)) / Math.cos(theta);
      }
    }
    cartesionLines.push({ theta, r, x1, y1, x2, y2 });
  }
  return cartesionLines;
}

export function Merge(
  lines: LineSegment[],
  options: ProcessingOptions
): LineSegment[] {
  // add weighted average of lines with similar theta
  const mergedLines: (LineSegment & { count: number })[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let merged = false;
    for (let j = 0; j < mergedLines.length; j++) {
      const mergedLine = mergedLines[j];
      if (
        (Math.sqrt(
          (line.x1 - mergedLine.x1) ** 2 + (line.y1 - mergedLine.y1) ** 2
        ) <
          options.squareSize / 4 &&
          Math.sqrt(
            (line.x2 - mergedLine.x2) ** 2 + (line.y2 - mergedLine.y2) ** 2
          ) <
            options.squareSize / 4) ||
        (Math.sqrt(
          (line.x1 - mergedLine.x2) ** 2 + (line.y1 - mergedLine.y2) ** 2
        ) <
          options.squareSize / 4 &&
          Math.sqrt(
            (line.x2 - mergedLine.x1) ** 2 + (line.y2 - mergedLine.y1) ** 2
          ) <
            options.squareSize / 4)
      ) {
        const count = mergedLine.count || 1;
        mergedLine.x1 = Math.round(
          (line.x1 + mergedLine.x1 * count) / (1 + count)
        );
        mergedLine.y1 = Math.round(
          (line.y1 + mergedLine.y1 * count) / (1 + count)
        );
        mergedLine.x2 = Math.round(
          (line.x2 + mergedLine.x2 * count) / (1 + count)
        );
        mergedLine.y2 = Math.round(
          (line.y2 + mergedLine.y2 * count) / (1 + count)
        );
        merged = true;
        break;
      }
    }
    if (!merged) {
      mergedLines.push({ ...line, count: 1 });
    }
  }
  return mergedLines.filter((line) => {
    const length = Math.sqrt(
      (line.x1 - line.x2) ** 2 + (line.y1 - line.y2) ** 2
    );
    return length > options.squareSize * 0.5;
  });
}

export function ShortenLines(
  lines: LineSegment[],
  data: Uint8ClampedArray,
  options: ProcessingOptions
) {
  let goodLines = [];
  // Find the actual number of edge pixels in each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const xStep = dx / length;
    const yStep = dy / length;
    let x = line.x1;
    let y = line.y1;
    let firstPixel: number[] = [];
    let lastPixel: number[] = [];
    for (let j = 0; j < length; j++) {
      if (
        data[Math.round(y) * options.squareSize + Math.round(x)] === 255 ||
        data[Math.round(y) * options.squareSize + Math.round(x + 1)] === 255 ||
        data[Math.round(y) * options.squareSize + Math.round(x - 1)] === 255 ||
        data[Math.round(y + 1) * options.squareSize + Math.round(x)] === 255 ||
        data[Math.round(y - 1) * options.squareSize + Math.round(x)] === 255
      ) {
        if (firstPixel.length === 0) {
          firstPixel = [x, y];
        }
        lastPixel = [x, y];
      }
      x += xStep;
      y += yStep;
    }
    const l = Math.sqrt(
      (lastPixel[0] - firstPixel[0]) ** 2 + (lastPixel[1] - firstPixel[1]) ** 2
    );
    goodLines.push({
      ...line,
      x1: firstPixel[0],
      y1: firstPixel[1],
      x2: lastPixel[0],
      y2: lastPixel[1],
      length: l,
    });
  }
  return goodLines
    .filter((line) => line.length > options.squareSize * 0.1)
    .slice(0, options.maxLines);
}

const vertexDistance = (v1: Vertex, v2: Vertex) =>
  Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);

function computeVertices(
  lines: LineSegment[],
  options: ProcessingOptions,
  longLines: LineSegment[]
) {
  let vertices: Vertex[] = [];
  for (let i = 0; i < longLines.length; i++) {
    for (let j = i + 1; j < longLines.length; j++) {
      const intersection = intersectionPoint(longLines[i], longLines[j]);
      if (
        intersection &&
        intersection.x > 0 &&
        intersection.y > 0 &&
        intersection.x < options.squareSize &&
        intersection.y < options.squareSize
      ) {
        if (
          !vertices.some(
            (v) => vertexDistance(v, intersection) < options.squareSize / 6
          )
        ) {
          vertices.push(intersection);
        }
      }
    }
  }
  let endPoints: Vertex[] = lines
    .map((line) => {
      const first = { x: line.x1, y: line.y1 };
      const last = { x: line.x2, y: line.y2 };
      let good: Vertex[] = [];
      let f = false;
      let l = false;
      for (let i = 0; i < vertices.length; i++) {
        const vertex = vertices[i];
        const d1 = vertexDistance(vertex, first);
        const d2 = vertexDistance(vertex, last);
        if (d1 < options.squareSize / 8) {
          f = true;
        }
        if (d2 < options.squareSize / 8) {
          l = true;
        }
      }
      if (!f) good.push(first);
      if (!l) good.push(last);
      return good;
    })
    .flat();
  let good: Vertex[] = [];
  for (let i = 0; i < endPoints.length; i++) {
    const p = endPoints[i];
    let merged = false;
    for (let j = 0; j < good.length; j++) {
      const q = good[j];
      if (vertexDistance(p, q) < options.squareSize / 10) {
        merged = true;
        good.push({
          x: (p.x + q.x) / 2,
          y: (p.y + q.y) / 2,
        });
        break;
      }
    }
    if (!merged) good.push(p);
  }
  return [...good, ...vertices]
    .map((vertex) => ({
      x: Math.round(vertex.x),
      y: Math.round(vertex.y),
    }))
    .filter(
      (vertex) =>
        vertex.x > 0 &&
        vertex.y > 0 &&
        vertex.x < options.squareSize &&
        vertex.y < options.squareSize
    );
}

function intersectionPoint(
  line1: LineSegment | Pick<LineSegment, "x1" | "x2" | "y1" | "y2">,
  line2: LineSegment | Pick<LineSegment, "x1" | "x2" | "y1" | "y2">
): Vertex | null {
  const x1 = line1.x1;
  const y1 = line1.y1;
  const x2 = line1.x2;
  const y2 = line1.y2;

  const x3 = line2.x1;
  const y3 = line2.y1;
  const x4 = line2.x2;
  const y4 = line2.y2;

  const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

  if (denominator === 0) {
    // The lines are parallel, so they don't intersect
    return null;
  }

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
  if (ua < -0.5 || ua > 1.5 || ub < -0.5 || ub > 1.5) {
    // The intersection point is outside of at least one of the line segments
    return null;
  }

  const x = x1 + ua * (x2 - x1);
  const y = y1 + ua * (y2 - y1);
  return { x, y };
}

function computeTrapezoid(
  vertices: Vertex[]
  // ctx?: CanvasRenderingContext2D
): TrapezoidalSlice | null {
  if (vertices.length < 4) return null;
  //  the shortest edge is the bottom edge
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
    id: Math.floor(Math.random() * 1000000000),
  };
}
