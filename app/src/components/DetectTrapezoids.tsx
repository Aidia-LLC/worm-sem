type Options = {
  squareSize: number;
  gaussianKernel: [number, number, number];
  hysteresisHigh: number;
  hysteresisLow: number;
  minNeighborsForNoiseReduction: number;
  houghVoteThreshold: number;
  mergeThetaThreshold: number;
  pixelThreshold: number;
  maxLines: number;
  noiseReductionIterations: number;
  densityThreshold: number;
  densityStep: number;
  densitySize: number;
};

export default function DetectTrapezoid(x: number, y: number, ctx: CanvasRenderingContext2D, options: Options): Trapezoid {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const square = getSquare(imageData, x, y, options.squareSize);
  ctx.beginPath();
  ctx.rect(
    x - options.squareSize / 2,
    y - options.squareSize / 2,
    options.squareSize,
    options.squareSize
  );
  ctx.strokeStyle = "red";
  ctx.stroke();
  ctx.closePath();

  const lines = hough(square, options);

  const goodLines = pixelsPerLine(lines, square, options);
  const vertices = computeVertices(goodLines).map((vertex) => ({
    x: vertex.x + x - options.squareSize / 2,
    y: vertex.y + y - options.squareSize / 2,
  }));
  const trapezoid: Trapezoid = computeTrapezoid(vertices);
  // DrawTrapezoid(trapezoid, ctx, 'yellow');
  const newTrapezoid = DirectSearchOptimization(
    getPointsOnTrapezoid,
    trapezoid,
    square,
    options,
    // ctx,
    x,
    y
  );
  console.log([newTrapezoid]);
  DrawTrapezoid(newTrapezoid, ctx, 'blue');
  return newTrapezoid;
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
  options: Options,
  thetaStep = Math.PI / 180,
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
          Math.floor(theta / thetaStep) < 180
            ? (accumulator[Math.floor(theta / thetaStep) + 1][
                r + maxDistance
              ] += 1)
            : null;
          Math.floor(theta / thetaStep) > 0
            ? (accumulator[Math.floor(theta / thetaStep) - 1][
                r + maxDistance
              ] += 1)
            : null;
          // maybe add diagnals
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
      if (votes > maxVotes) {
        maxVotes = votes;
      }
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
        if (skip) {
          continue;
        }
        lines.push({ theta, r: r - maxDistance });
      }
    }
  }
  return CartesionLines(lines, width, height, options);
}

function CartesionLines(
  lines: IHoughLine[],
  width: number,
  height: number,
  options: Options
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
  return Merge(cartesionLines, options);
}

function Merge(lines: LineSegment[], options: Options): LineSegment[] {
  // add weighted average of lines with similar theta
  const mergedLines: (LineSegment & { count: number })[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let merged = false;
    for (let j = 0; j < mergedLines.length; j++) {
      const mergedLine = mergedLines[j];
      if (
        Math.sqrt(
          (line.x1 - mergedLine.x1) ** 2 + (line.y1 - mergedLine.y1) ** 2
        ) < options.mergeThetaThreshold &&
        Math.sqrt(
          (line.x2 - mergedLine.x2) ** 2 + (line.y2 - mergedLine.y2) ** 2
        ) < options.mergeThetaThreshold
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

function pixelsPerLine(
  lines: LineSegment[],
  data: Uint8ClampedArray,
  options: Options
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
    let pixels = 0;
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
        pixels++;
      }
      x += xStep;
      y += yStep;
    }
    goodLines.push({
      ...line,
      pixels,
      x1: firstPixel[0],
      y1: firstPixel[1],
      x2: lastPixel[0],
      y2: lastPixel[1],
      length: Math.sqrt(
        (lastPixel[0] - firstPixel[0]) ** 2 +
          (lastPixel[1] - firstPixel[1]) ** 2
      ),
    });
  }
  const maxPixels = Math.max(...goodLines.map((line) => line.pixels));
  return goodLines
    .filter(
      (line) =>
        line.pixels > maxPixels * options.pixelThreshold &&
        line.length > options.squareSize * 0.25
    )
    .sort((a, b) => a.pixels - b.pixels)
    .slice(0, options.maxLines);
  // return goodLines.filter(line => line.pixels > maxPixels * options.pixelThreshold).sort((a,b) => a.pixels - b.pixels).slice(0, options.maxLines);
}

function computeVertices(lines: LineSegment[]) {
  let vertices: Vertex[] = [];
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const intersection = intersectionPoint(lines[i], lines[j]);
      if (intersection) {
        vertices.push(intersection);
      }
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    vertices.push({ x: line.x1, y: line.y1 });
    vertices.push({ x: line.x2, y: line.y2 });
  }
  // Remove duplicates and similar points
  vertices = vertices.filter((vertex, index) => {
    for (let i = 0; i < index; i++) {
      if (Math.abs(vertex.x - vertices[i].x) < 5) {
        if (Math.abs(vertex.y - vertices[i].y) < 5) {
          return false;
        }
      }
    }
    return true;
  });
  return vertices.map((vertex) => ({
    x: Math.round(vertex.x),
    y: Math.round(vertex.y),
  }));
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

  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    // The intersection point is outside of at least one of the line segments
    return null;
  }

  const x = x1 + ua * (x2 - x1);
  const y = y1 + ua * (y2 - y1);

  return { x, y };
}

function DrawTrapezoid(
  trapezoid: Trapezoid,
  ctx: CanvasRenderingContext2D,
  color: string = "green"
) {
  ctx.beginPath();
  ctx.moveTo(trapezoid.top.x1, trapezoid.top.y1);
  ctx.lineTo(trapezoid.top.x2, trapezoid.top.y2);
  ctx.lineTo(trapezoid.bottom.x2, trapezoid.bottom.y2);
  ctx.lineTo(trapezoid.bottom.x1, trapezoid.bottom.y1);
  ctx.lineTo(trapezoid.top.x1, trapezoid.top.y1);
  ctx.strokeStyle = color;
  ctx.stroke();
}

function DirectSearchOptimization(
  ft: (
    data: Uint8ClampedArray,
    trapezoid: Trapezoid,
    options: Options,
    x: number,
    y: number,
    // ctx: CanvasRenderingContext2D,
    squareSize?: number
  ) => number,
  trapezoid: Trapezoid,
  data: Uint8ClampedArray,
  options: Options,
  // ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  squareSize?: number
) {
  // Move each vertex in trapezoid by 5 pixels in 16 directions, take the best one
  let vertices = [
    { x: trapezoid.top.x1, y: trapezoid.top.y1 },
    { x: trapezoid.top.x2, y: trapezoid.top.y2 },
    { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 },
    { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 },
  ];
  let bestFt: number = ft(data, trapezoid, options, x, y, squareSize);
  console.log("bestFt init", bestFt, trapezoid);
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

        const newFt = ft(data, newTrapezoid, options, x, y, squareSize);
        if (bestFt === undefined || newFt > bestFt) {
          bestFt = newFt;
          console.log({newFt})
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
  return computeTrapezoid(vertices);
}

function getPointsOnTrapezoid(
  data: Uint8ClampedArray,
  trapezoid: Trapezoid,
  options: Options,
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
      if(!(x+xStep*j > 0 && x+xStep*j < (squareSize ?? options.squareSize) && y+yStep*j > 0 && y+yStep*j < (squareSize ?? options.squareSize))) continue
      if (
        data[
          Math.round(y + (yStep * j)) * (squareSize ?? options.squareSize) + Math.round(x + (xStep*j))
        ] === 255 ||
        data[
          Math.round(y + (yStep * j)) * (squareSize ?? options.squareSize) + Math.round(x + (xStep*j) + 1)
        ] === 255 ||
        data[
          Math.round(y + (yStep * j)) * (squareSize ?? options.squareSize) + Math.round(x + (xStep*j) - 1)
        ] === 255 ||
        data[
          Math.round(y + (yStep * j) + 1) * (squareSize ?? options.squareSize) + Math.round(x + (xStep*j))
        ] === 255 ||
        data[
          Math.round(y + (yStep * j) - 1) * (squareSize ?? options.squareSize) + Math.round(x + (xStep*j))
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

// function drawSquare(square: Uint8ClampedArray, ctx: CanvasRenderingContext2D, width: number) {
//   for (let i = 0; i < square.length; i++) {
//     if (square[i] === 255) {
//       ctx.beginPath();
//       ctx.rect(i % width, Math.floor(i / width), 1, 1);
//       ctx.strokeStyle = "red";
//       ctx.stroke();
//     }
//   }
// }

function computeTrapezoid(
  vertices: Vertex[],
  ctx?: CanvasRenderingContext2D
): Trapezoid {
  const sums = vertices.map((vertex) => vertex.x + vertex.y);
  const topLeft = vertices[sums.indexOf(Math.min(...sums))];
  const bottomRight = vertices[sums.indexOf(Math.max(...sums))];
  const differences = vertices.map((vertex) => vertex.x - vertex.y);
  const topRight = vertices[differences.indexOf(Math.max(...differences))];
  const bottomLeft = vertices[differences.indexOf(Math.min(...differences))];

  if (ctx && vertices.length === 4) {
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.lineTo(topLeft.x, topLeft.y);
    ctx.strokeStyle = "red";
    ctx.stroke();
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