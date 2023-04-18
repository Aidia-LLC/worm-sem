
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

export function edgeFilter(canvas: HTMLCanvasElement, options: any, imageData: ImageData, ctx: CanvasRenderingContext2D) {
    const grayImageData = grayscale(imageData, ctx);

      //Apply a gausian blur
      const blurImageData1 = gaussianBlur(grayImageData, ctx, options);
      const blurImageData = gaussianBlur(blurImageData1, ctx, options);

      ctx.putImageData(blurImageData, 0, 0);

      const Noisy = canny(blurImageData, options);
      const Weak = RemoveNoise(
        Noisy,
        blurImageData.width,
        blurImageData.height,
        options
      );
      const edgeData = ConnectStrongEdges(
        Weak,
        blurImageData.width,
        blurImageData.height
      );
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
      // This uses edge pixel density to remove the spots in the middle of the trapezoids
      colorPixelsByDensity(ctx, canvas, options);
      const data = ctx
        .getImageData(0, 0, canvas.width, canvas.height)
        .data.filter((_, i) => i % 4 === 0);
      const betterData = ConnectStrongEdges2(data, canvas.width, canvas.height);
      const betterStuff = new Uint8ClampedArray(
        canvas.width * canvas.height * 4
      );
      for (let i = 0; i < betterData.length; i += 1) {
        betterStuff[i * 4] = betterData[i] > 1 ? 255 : 0;
        betterStuff[i * 4 + 1] = betterData[i] > 1 ? 255 : 0;
        betterStuff[i * 4 + 2] = betterData[i] > 1 ? 255 : 0;
        betterStuff[i * 4 + 3] = 255;
      }
  newImageData.data.set(betterStuff);
  return betterStuff
}

function colorPixelsByDensity(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  options: Options
) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  // loop through every 5 pixels, scan a 5x5 square around it
  for (let x = 0; x < canvas.width; x += options.densityStep) {
    for (let y = 0; y < canvas.height; y += options.densityStep) {
      const square = getSquare(
        imageData,
        Math.round(x),
        y,
        options.densitySize
      );
      const edgePixels = square.filter((pixel) => pixel > 1).length;
      const density = edgePixels / (options.densitySize * options.densitySize);
      if (density > options.densityThreshold) {
        // set pixels in the actual image to 0
        for (let i = 0; i < options.densitySize; i++) {
          for (let j = 0; j < options.densitySize; j++) {
            const half = Math.floor(options.densitySize / 2);
            const index = ((y - half + i) * canvas.width + x - half + j) * 4;
            imageData.data[index] = 0;
            imageData.data[index + 1] = 0;
            imageData.data[index + 2] = 0;
            imageData.data[index + 3] = 255;
          }
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
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

function gaussianBlur(
  imageData: ImageData,
  ctx: CanvasRenderingContext2D,
  options: Options
) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const blurImageData =
    ctx?.createImageData(imageData.width, imageData.height) ??
    new ImageData(0, 0);
  const blurData = blurImageData.data;
  const kernel = [
    [
      options.gaussianKernel[0],
      options.gaussianKernel[1],
      options.gaussianKernel[0],
    ],
    [
      options.gaussianKernel[1],
      options.gaussianKernel[2],
      options.gaussianKernel[1],
    ],
    [
      options.gaussianKernel[0],
      options.gaussianKernel[1],
      options.gaussianKernel[0],
    ],
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

function canny(grayImageData: ImageData, options: Options) {
  const width = grayImageData.width;
  const height = grayImageData.height;
  const grayscaleData = grayImageData.data;

  //   // Compute the gradient magnitude and direction
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
  const edgeData = new Uint8ClampedArray(width * height);
  const highThresholdValue = Math.round(options.hysteresisHigh * 255);
  const lowThresholdValue = Math.round(options.hysteresisLow * 255);
  for (let i = 0; i < width * height; i++) {
    const value = Math.round(suppressedData[i]);
    if (value <= highThresholdValue && value >= lowThresholdValue) {
      edgeData[i] = 255;
    } else {
      edgeData[i] = 0;
    }
  }
  return edgeData;
}

function RemoveNoise(
  edgeData: Uint8ClampedArray,
  width: number,
  height: number,
  options: Options
): Uint8ClampedArray {
  const data = edgeData;
  for (let t = 0; t < options.noiseReductionIterations; t++) {
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
          if (count < options.minNeighborsForNoiseReduction) {
            data[i] = 0;
          }
        }
      }
    }
  }
  return edgeData;
}

function ConnectStrongEdges(
  edgeData: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const data = edgeData;
  for (let t = 0; t < 2; t++) {
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
          // check diagonals
          if (data[(y + 2) * width + x + 2] === 255) {
            data[(y + 1) * width + x + 1] = 255;
          }
          if (data[(y + 2) * width + x - 2] === 255) {
            data[(y + 1) * width + x - 1] = 255;
          }
          if (data[(y - 2) * width + x + 2] === 255) {
            data[(y - 1) * width + x + 1] = 255;
          }
          if (data[(y - 2) * width + x - 2] === 255) {
            data[(y - 1) * width + x - 1] = 255;
          }
        }
      }
    }
  }
  return edgeData;
}

function ConnectStrongEdges2(
  edgeData: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const data = edgeData;
  for (let t = 0; t < 2; t++) {
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
          // check diagonals
          if (data[(y + 2) * width + x + 2] === 255) {
            data[(y + 1) * width + x + 1] = 255;
          }
          if (data[(y + 2) * width + x - 2] === 255) {
            data[(y + 1) * width + x - 1] = 255;
          }
          if (data[(y - 2) * width + x + 2] === 255) {
            data[(y - 1) * width + x + 1] = 255;
          }
          if (data[(y - 2) * width + x - 2] === 255) {
            data[(y - 1) * width + x - 1] = 255;
          }
        }
      }
    }
  }
  return edgeData;
}



