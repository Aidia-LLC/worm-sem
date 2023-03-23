// import { convert } from "src/data/image/main";
export const setupCanvas2 = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d")!;
  const img = new Image();
  img.onload = function () {
    if (!ctx) return;
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const grayImageData = grayscale(imageData, ctx);
    // console.log("grayImageData", grayImageData);
    //Apply a gausian blur
    const blurImageData1 = gaussianBlur(grayImageData, ctx);
    const blurImageData = gaussianBlur(blurImageData1, ctx);

    ctx.putImageData(blurImageData, 0, 0);

    const edgeData = canny(blurImageData);
    //convert edgeData from uint8clampedarray to imageData
    const newImageData = ctx.createImageData(canvas.width, canvas.height);
    const pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4);
    for (let i = 0; i < edgeData.length; i += 1) {
      pixels[i * 4] = edgeData[i] > 1 ? 255 : 0;
      pixels[i * 4 + 1] = edgeData[i] > 1 ? 255 : 0;
      pixels[i * 4 + 2] = edgeData[i] > 1 ? 255 : 0;
      pixels[i * 4 + 3] = 255;
    }
    newImageData.data.set(pixels);
    ctx.putImageData(newImageData, 0, 0);
  };
  img.src = "/img/grab1.png";

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const rectWidth = rect.right - rect.left;
    const rectHeight = rect.bottom - rect.top;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imgX = Math.round((x / rectWidth) * canvas.width);
    const imgY = Math.round((y / rectHeight) * canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixelIndex = (imgY * imageData.width + imgX) * 4;
    const pixel = imageData.data[pixelIndex];
    console.log("pixel", pixel);
    detectTrapezoids(imgX, imgY, ctx);
  });

  // when the edge data is drawn, prmpt user to click in the middle of trapezoids
  // then draw the trapezoids and find and draw connected trapezoids
  // user can click in middle of drawn trapezoid to delete it
};

function detectTrapezoids(x: number, y: number, ctx: CanvasRenderingContext2D) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  // get a square of pixels around the clicked point
  const square = getSquare(imageData, x, y, 100);
  // draw and fill the square pixels red
  ctx.beginPath();
  ctx.rect(x - 50, y - 50, 100, 100);
  ctx.strokeStyle = "red";
  ctx.stroke();
  ctx.closePath();

  const lines = hough(square, 100, 100);
  const goodLines = pixelsPerLine(lines, square);
  // draw each line
  for (const line of goodLines) {
    ctx.beginPath();
    ctx.moveTo(line.x1 + x - 50, line.y1 + y - 50);
    ctx.lineTo(line.x2 + x - 50, line.y2 + y - 50);
    ctx.strokeStyle = "red";
    ctx.stroke();
  }
  // const vertices = computeVertices(lines);
  // drawVertices(vertices, ctx, x - 50, y - 50);

  // const trapezoids = computeTrapezoids(lineGroups, ctx);
  // console.log("trapezoids", trapezoids);
  // drawTrapezoids(trapezoids, ctx);
  // const connectedTrapezoids = findConnectedTrapezoids(trapezoids, x, y);
  // console.log("connectedTrapezoids", connectedTrapezoids);
  // drawConnectedTrapezoids(connectedTrapezoids, ctx);
}

function drawVertices(
  vertices: Vertex[],
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  for (const vertex of vertices) {
    ctx.beginPath();
    ctx.arc(vertex.x + x, vertex.y + y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.closePath();
  }
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
  for (let i = startX; i < endX; i += 1) {
    for (let j = startY; j < endY; j += 1) {
      const pixelIndex = (j * width + i) * 4;
      square.push(imageData[pixelIndex]);
    }
  }
  return square as unknown as Uint8ClampedArray;
}
//   // function detectTrapezoids(vertices) {
//   //   // TODO: Implement trapezoid detection
//   // }

//   // function drawTrapezoids(canvas, trapezoids) {
//   //   // TODO: Implement trapezoid drawing
//   // }
// };

function grayscale(imageData: ImageData, ctx?: CanvasRenderingContext2D) {
  // console.log("grayscale before", imageData);
  const data = imageData.data;
  const grayImageData =
    ctx?.createImageData(imageData.width, imageData.height) ??
    new ImageData(0, 0);
  const grayData = grayImageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Because data is one dimensional array of RGBA values in that order
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    grayData[i] = gray;
    grayData[i + 1] = gray;
    grayData[i + 2] = gray;
    grayData[i + 3] = 255;
  }
  // console.log("grayscale after", grayImageData);
  return grayImageData;
}

function gaussianBlur(imageData: ImageData, ctx: CanvasRenderingContext2D) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const blurImageData =
    ctx?.createImageData(imageData.width, imageData.height) ??
    new ImageData(0, 0);
  const blurData = blurImageData.data;
  const kernel = [
    [1 / 16, 1 / 8, 1 / 16],
    [1 / 8, 1 / 4, 1 / 8],
    [1 / 16, 1 / 8, 1 / 16],
  ];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0,
        g = 0,
        b = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const i = (y + ky) * width + (x + kx);
          r += data[i * 4] * kernel[ky + 1][kx + 1];
          g += data[i * 4 + 1] * kernel[ky + 1][kx + 1];
          b += data[i * 4 + 2] * kernel[ky + 1][kx + 1];
        }
      }
      const i = y * width + x;
      blurData[i * 4] = r;
      blurData[i * 4 + 1] = g;
      blurData[i * 4 + 2] = b;
      blurData[i * 4 + 3] = 255;
    }
  }
  return blurImageData;
}

function canny(grayImageData: ImageData) {
  const width = grayImageData.width;
  const height = grayImageData.height;
  const grayscaleData = grayImageData.data;

  // Compute the gradient magnitude and direction
  const gradientData = new Float32Array(width * height);
  const directionData = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const gx = // Gradient in x direction
        grayscaleData[(y * width + x + 1) * 4] -
        grayscaleData[(y * width + x - 1) * 4];
      const gy = // Gradient in y direction
        grayscaleData[((y + 1) * width + x) * 4] -
        grayscaleData[((y - 1) * width + x) * 4];
      const gradient = Math.sqrt(gx * gx + gy * gy);
      const direction = Math.atan2(-gy, gx);
      gradientData[y * width + x] = gradient;
      directionData[y * width + x] = direction;
    }
  }

  // Perform non-maximum suppression
  const suppressedData = new Float32Array(width * height);
  for (let y = 3; y < height - 3; y++) {
    for (let x = 3; x < width - 3; x++) {
      const direction = directionData[y * width + x];
      let q, r; //neighbor pixels
      if (
        (direction >= -Math.PI / 8 && direction < Math.PI / 8) ||
        (direction >= (7 * Math.PI) / 8 && direction <= Math.PI) ||
        (direction >= -Math.PI && direction < (-7 * Math.PI) / 8)
      ) {
        q = gradientData[y * width + x + 3];
        r = gradientData[y * width + x - 3];
      } else if (
        (direction >= Math.PI / 8 && direction < (3 * Math.PI) / 8) ||
        (direction >= (-7 * Math.PI) / 8 && direction < (-5 * Math.PI) / 8)
      ) {
        q = gradientData[(y + 3) * width + x + 3];
        r = gradientData[(y - 3) * width + x - 3];
      } else if (
        (direction >= (3 * Math.PI) / 8 && direction < (5 * Math.PI) / 8) ||
        (direction >= (-5 * Math.PI) / 8 && direction < (-3 * Math.PI) / 8)
      ) {
        q = gradientData[(y + 3) * width + x];
        r = gradientData[(y - 3) * width + x];
      } else {
        q = gradientData[(y + 3) * width + x - 3];
        r = gradientData[(y - 3) * width + x + 3];
      }
      const p = gradientData[y * width + x];
      if (p >= q && p >= r) {
        suppressedData[y * width + x] = p; // Only keep the strong edges
      }
    }
  }

  // Perform hysteresis thresholding
  const highThreshold = 0.1; // Adjust as needed. Maybe higher?
  const lowThreshold = 0.03; // Adjust as needed
  const edgeData = new Uint8ClampedArray(width * height);
  const highThresholdValue = Math.round(highThreshold * 255);
  const lowThresholdValue = Math.round(lowThreshold * 255);
  for (let i = 0; i < width * height; i++) {
    const value = Math.round(suppressedData[i]);
    if (value <= highThresholdValue && value >= lowThresholdValue) {
      edgeData[i] = 255;
    } else {
      edgeData[i] = 0;
    }
  }
  return RemoveNoise(edgeData, width, height);
}

function RemoveNoise(
  edgeData: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const data = edgeData;
  for (let x = 1; x < width - 1; x++) {
    for (let y = 1; y < height - 1; y++) {
      const i = y * width + x;
      if (data[i] === 255) {
        let count = 0;
        for (let ky = -2; ky <= 2; ky++) {
          for (let kx = -2; kx <= 2; kx++) {
            if (data[(y + ky) * width + x + kx] === 255) {
              count++;
            }
          }
        }
        if (count < 5) {
          data[i] = 0;
        }
      }
    }
  }
  return ConnectStrongEdges(edgeData, width, height); // How much does this help?
}

function ConnectStrongEdges(
  edgeData: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const data = edgeData;
  for (let x = 1; x < width - 1; x++) {
    for (let y = 1; y < height - 1; y++) {
      const i = y * width + x;
      if (data[i] === 255) {
        // Check if any neighbors 2 away are strong edges, if so make pixel in between a strong edge
        if (data[(y + 2) * width + x] === 255) {
          data[(y + 1) * width + x] = 255;
        }
        if (data[(y - 2) * width + x] === 255) {
          data[(y - 1) * width + x] = 255;
        }
        if (data[y * width + x + 2] === 255) {
          data[y * width + x + 1] = 255;
        }
        if (data[y * width + x - 2] === 255) {
          data[y * width + x - 1] = 255;
        }
      }
    }
  }
  return edgeData;
}

interface IHoughLine {
  theta: number;
  r: number;
}

function hough(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  thetaStep = Math.PI / 180
): LineSegment[] {
  // Calculate the maximum possible distance in the image
  const maxDistance = Math.ceil(Math.sqrt(width * width + height * height));

  // Create an accumulator array
  const accumulator: number[][] = [];
  for (let i = 0; i < 180 / thetaStep; i++) {
    accumulator.push(new Array(maxDistance * 2).fill(0));
  }

  // Iterate over all edge pixels
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
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
  const threshold = maxVotes * 0.65;
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
    cartesionLines.push({ theta, r, x1: y1, y1: x1, x2: y2, y2: x2 });
  }
  return Merge(cartesionLines);
}

function Merge(lines: LineSegment[]): LineSegment[] {
  // add weighted average of lines with similar theta
  const mergedLines: LineSegment[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let merged = false;
    for (let j = 0; j < mergedLines.length; j++) {
      const mergedLine = mergedLines[j];
      if (Math.abs(line.theta - mergedLine.theta) < 1) {
        mergedLine.x1 = Math.round((line.x1 + mergedLine.x1) / 2);
        mergedLine.y1 = Math.round((line.y1 + mergedLine.y1) / 2);
        mergedLine.x2 = Math.round((line.x2 + mergedLine.x2) / 2);
        mergedLine.y2 = Math.round((line.y2 + mergedLine.y2) / 2);
        merged = true;
        break;
      }
    }
    if (!merged) {
      mergedLines.push(line);
    }
  }
  return lines;
}

function pixelsPerLine(
  lines: LineSegment[],
  data: Uint8ClampedArray,
  width = 100
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
    let pixels = 0;
    for (let j = 0; j < length; j++) {
      if (data[Math.round(y) * width + Math.round(x)] === 255) {
        pixels++;
      }
      x += xStep;
      y += yStep;
    }
    if (pixels > 10) {
      goodLines.push(line);
      console.log({ pixels, line, ratio: pixels / length });
    }
  }
  return goodLines;
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
  console.log({ vertices });
  return vertices;
}

interface Point {
  x: number;
  y: number;
}

function intersectionPoint(
  line1: LineSegment,
  line2: LineSegment
): Point | null {
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
