import { permuteTrapezoid } from "@logic/canvas";
import { ProcessingOptions } from "src/types/ProcessingOptions";
import { Slice } from "../../types/shapes";

export function detectTrapezoid(
  x: number,
  y: number,
  imageData: ImageData,
  ctx: CanvasRenderingContext2D,
  options: ProcessingOptions
) {
  ctx.lineWidth = 8;
  // draw imageData
  ctx.putImageData(imageData, 0, 0);

  const square = getSquare(imageData, x, y, options.squareSize);
  // draw square
  // ctx.beginPath();
  // ctx.rect(
  //   x - options.squareSize / 2,
  //   y - options.squareSize / 2,
  //   options.squareSize,
  //   options.squareSize
  // );
  // ctx.strokeStyle = "blue";
  // ctx.stroke();
  // ctx.closePath();

  const lines = hough(square, options);
  // for (const line of lines) {
  //   ctx.beginPath();
  //   ctx.moveTo(
  //     line.x1 + x - options.squareSize / 2,
  //     line.y1 + y - options.squareSize / 2
  //   );
  //   ctx.lineTo(
  //     line.x2 + x - options.squareSize / 2,
  //     line.y2 + y - options.squareSize / 2
  //   );
  //   ctx.strokeStyle = "green";
  //   ctx.stroke();
  //   ctx.closePath();
  // }
  // console.log("lines", lines);
  const goodLines = Merge(lines, options);
  // console.log("mergedLines", mergedLines);
  // for (const line of mergedLines) {
  //   ctx.beginPath();
  //   ctx.lineWidth = 6;
  //   ctx.moveTo(
  //     line.x1 + x - options.squareSize / 2,
  //     line.y1 + y - options.squareSize / 2
  //   );
  //   ctx.lineTo(
  //     line.x2 + x - options.squareSize / 2,
  //     line.y2 + y - options.squareSize / 2
  //   );
  //   ctx.strokeStyle = "green";
  //   ctx.stroke();
  //   ctx.closePath();
  // }

  // const goodLines = DirectSearchLineOptimization(
  //   pixelsPerLine,
  //   [...mergedLines],
  //   square,
  //   options
  // );
  console.log("goodLines", goodLines);
  for (const line of goodLines) {
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.moveTo(
      line.x1 + x - options.squareSize / 2,
      line.y1 + y - options.squareSize / 2
    );
    ctx.lineTo(
      line.x2 + x - options.squareSize / 2,
      line.y2 + y - options.squareSize / 2
    );
    ctx.strokeStyle = "blue";
    ctx.stroke();
    ctx.closePath();
  }

  const shortLines = ShortenLines(goodLines, square, options);
  console.log("shortLines", shortLines);
  for (const line of shortLines) {
    ctx.beginPath();
    ctx.lineWidth = 8;
    ctx.moveTo(
      line.x1 + x - options.squareSize / 2,
      line.y1 + y - options.squareSize / 2
    );
    ctx.lineTo(
      line.x2 + x - options.squareSize / 2,
      line.y2 + y - options.squareSize / 2
    );
    ctx.strokeStyle = "green";
    ctx.stroke();
    ctx.closePath();
  }
  const vertices = computeVertices(shortLines, options, goodLines).map(
    (vertex) => ({
      x: vertex.x + x - options.squareSize / 2,
      y: vertex.y + y - options.squareSize / 2,
    })
  );

  let trapezoid: Trapezoid | null = null;
  if (vertices.length === 4) {
    trapezoid = computeTrapezoid(vertices);
  } else {
    // go through each combination of 4 vertices and find the best trapezoid, using getPointsOnTrapezoid
    const combinations = Combinations(vertices, 4);
    let bestFit = 0;
    for (const combination of combinations) {
      const newTrapezoid = computeTrapezoid(combination);
      if (!newTrapezoid) continue;
      const fit = getPointsOnTrapezoid(square, newTrapezoid, options, x, y);
      if (fit > bestFit) {
        bestFit = fit;
        trapezoid = newTrapezoid;
      }
    }
  }
  if (!trapezoid) {
    return { trapezoid: null, fit: null };
  }
  // DrawTrapezoid(trapezoid, ctx, "yellow", 15);

  const { trapezoid: newTrapezoid, fit } = DirectSearchOptimization(
    getPointsOnTrapezoid,
    trapezoid,
    square,
    options,
    // ctx,
    x,
    y
  );

  if (!newTrapezoid) return { trapezoid: null, fit: null };
  // DrawTrapezoid(newTrapezoid, ctx, "yellow", 15);
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

function getSquare(fullImage: ImageData, x: number, y: number, size: number) {
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

type Trapezoid = {
  top: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  right: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  left: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  bottom: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
};

interface IHoughLine {
  theta: number;
  r: number;
}

type LineSegment = {
  r: number;
  theta: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type Vertex = {
  x: number;
  y: number;
};

function hough(
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

function Merge(
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
        ) < options.mergeLineThreshold &&
          Math.sqrt(
            (line.x2 - mergedLine.x2) ** 2 + (line.y2 - mergedLine.y2) ** 2
          ) < options.mergeLineThreshold) ||
        (Math.sqrt(
          (line.x1 - mergedLine.x2) ** 2 + (line.y1 - mergedLine.y2) ** 2
        ) < options.mergeLineThreshold &&
          Math.sqrt(
            (line.x2 - mergedLine.x1) ** 2 + (line.y2 - mergedLine.y1) ** 2
          ) < options.mergeLineThreshold)
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
  return mergedLines;
}

// function pixelsPerLine(
//   line: LineSegment,
//   data: Uint8ClampedArray,
//   options: ProcessingOptions
// ) {
//   const dx = line.x2 - line.x1;
//   const dy = line.y2 - line.y1;
//   const length = Math.sqrt(dx * dx + dy * dy);
//   const xStep = dx / length;
//   const yStep = dy / length;
//   let x = line.x1;
//   let y = line.y1;
//   let pixels = 0;
//   for (let j = 0; j < length; j++) {
//     if (
//       data[Math.round(y) * options.squareSize + Math.round(x)] === 255 ||
//       data[Math.round(y) * options.squareSize + Math.round(x + 1)] === 255 ||
//       data[Math.round(y) * options.squareSize + Math.round(x - 1)] === 255 ||
//       data[Math.round(y + 1) * options.squareSize + Math.round(x)] === 255 ||
//       data[Math.round(y - 1) * options.squareSize + Math.round(x)] === 255
//     ) {
//       pixels++;
//     }
//     x += xStep;
//     y += yStep;
//   }
//   return pixels;
// }

function ShortenLines(
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
  // const maxPixels = Math.max(...goodLines.map((line) => line.pixels));
  return goodLines
    .filter(
      (line) =>
        // line.pixels > maxPixels * options.pixelThreshold &&
        line.length > options.squareSize * 0.1
    )
    .slice(0, options.maxLines);
  // return goodLines.filter(line => line.pixels > maxPixels * options.pixelThreshold).sort((a,b) => a.pixels - b.pixels).slice(0, options.maxLines);
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
        if (d1 < options.squareSize / 6) {
          f = true;
        }
        if (d2 < options.squareSize / 6) {
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
      if (vertexDistance(p, q) < options.squareSize / 6) {
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

// function DirectSearchLineOptimization(
//   ft: (
//     line: LineSegment,
//     data: Uint8ClampedArray,
//     options: ProcessingOptions
//   ) => number,
//   lines: LineSegment[],
//   data: Uint8ClampedArray,
//   options: ProcessingOptions
// ) {
//   const bestLines = [...lines];
//   for (let k = 0; k < lines.length; k++) {
//     const line = lines[k];
//     let fit = ft(line, data, options);
//     //Move each vertex in line by 5 pixels in 16 directions, take the best one
//     let vertices = [
//       { x: line.x1, y: line.y1 },
//       { x: line.x2, y: line.y2 },
//     ];
//     for (let l = 0; l < 2; l++) {
//       for (let i = 0; i < vertices.length; i++) {
//         for (let j = 0; j < 16; j++) {
//           const vertex = vertices[i];
//           // move the vertex by a varied amount in 16 directions, keep the best
//           let x = (vertex.x + (l % 4)) * Math.cos((j * Math.PI) / 8);
//           x = Math.max(0, Math.min(x, options.squareSize));
//           let y = (vertex.y + (l % 4)) * Math.sin((j * Math.PI) / 8);
//           y = Math.max(0, Math.min(y, options.squareSize));
//           const newVertex = {
//             x,
//             y,
//           };
//           const newLine = {
//             x1: i === 0 ? newVertex.x : line.x1,
//             y1: i === 0 ? newVertex.y : line.y1,
//             x2: i === 1 ? newVertex.x : line.x2,
//             y2: i === 1 ? newVertex.y : line.y2,
//             r: line.r,
//             theta: line.theta,
//           };
//           const newFT = ft(newLine, data, options);
//           if (newFT > fit) {
//             fit = newFT;
//             vertices[i] = newVertex;
//           }
//         }
//       }
//     }
//     bestLines[k] = {
//       x1: vertices[0].x,
//       y1: vertices[0].y,
//       x2: vertices[1].x,
//       y2: vertices[1].y,
//       r: line.r,
//       theta: line.theta,
//     };
//   }
//   return bestLines;
// }

function DirectSearchOptimization(
  ft: (
    data: Uint8ClampedArray,
    trapezoid: Trapezoid,
    options: ProcessingOptions,
    x: number,
    y: number,
    // ctx: CanvasRenderingContext2D,
    squareSize?: number
  ) => number,
  trapezoid: Trapezoid,
  data: Uint8ClampedArray,
  options: ProcessingOptions,
  // ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  squareSize?: number
) {
  // Move each vertex in trapezoid by a varied amount of pixels in 16 directions, take the best one
  let vertices = [
    { x: trapezoid.top.x1, y: trapezoid.top.y1 },
    { x: trapezoid.top.x2, y: trapezoid.top.y2 },
    { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 },
    { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 },
  ];
  let bestFt: number = ft(data, trapezoid, options, x, y, squareSize);
  // console.log("bestFt init", bestFt, trapezoid);
  for (let k = 0; k < 16; k++) {
    for (let i = 0; i < vertices.length; i++) {
      let bestVertex: Vertex | undefined;
      const vertex = vertices[i];
      for (let j = 0; j < 16; j++) {
        const direction = (j * Math.PI) / 8;
        const dx = Math.cos(direction) * (((k % 4) + 1) * 2);
        const dy = Math.sin(direction) * (((k % 4) + 1) * 2);
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
        if (!newTrapezoid) {
          continue;
        }
        const newFt = ft(data, newTrapezoid, options, x, y, squareSize);
        if (bestFt === undefined || newFt > bestFt) {
          bestFt = newFt;
          // console.log({newFt})
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
  return { trapezoid: computeTrapezoid(vertices), fit: bestFt };
}

function getPointsOnTrapezoid(
  data: Uint8ClampedArray,
  trapezoid: Trapezoid,
  options: ProcessingOptions,
  xx: number,
  yy: number,
  // ctx: CanvasRenderingContext2D,
  squareSize?: number
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
        // ctx.beginPath();
        // ctx.rect(Math.round(x + xStep*j) + xx - options.squareSize / 2, Math.round(y + yStep*j) + yy - options.squareSize/2, 1, 1);
        // ctx.strokeStyle = "red";
        // ctx.stroke();
      }
    }
  }
  return points;
}

function computeTrapezoid(
  vertices: Vertex[]
  // ctx?: CanvasRenderingContext2D
): Slice | null {
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
