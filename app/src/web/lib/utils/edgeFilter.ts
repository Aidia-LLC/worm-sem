export function edgeFilter(
  canvas: HTMLCanvasElement,
  imageData: ImageData,
  ctx: CanvasRenderingContext2D
) {
  ctx.putImageData(imageData, 0, 0);

  const edgePixels = canny(imageData);
  const edgeData = ConnectStrongEdges(
    edgePixels,
    imageData.width,
    imageData.height
  );
  // convert edgeData from uint8clampedarray to imageData
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
  const data = ctx
    .getImageData(0, 0, canvas.width, canvas.height)
    .data.filter((_, i) => i % 4 === 0);
  const betterData = ConnectStrongEdges2(data, canvas.width, canvas.height);
  const betterStuff = new Uint8ClampedArray(canvas.width * canvas.height * 4);
  for (let i = 0; i < betterData.length; i += 1) {
    betterStuff[i * 4] = betterData[i] > 1 ? 255 : 0;
    betterStuff[i * 4 + 1] = betterData[i] > 1 ? 255 : 0;
    betterStuff[i * 4 + 2] = betterData[i] > 1 ? 255 : 0;
    betterStuff[i * 4 + 3] = 255;
  }
  newImageData.data.set(betterStuff);
  return newImageData;
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
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
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
  for (let i = 0; i < width * height; i++) {
    const value = Math.round(suppressedData[i]);
    if (value > 0) {
      edgeData[i] = 255;
    } else {
      edgeData[i] = 0;
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
