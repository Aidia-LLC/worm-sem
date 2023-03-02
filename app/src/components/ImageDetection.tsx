export const setupCanvas = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = function () {
    if (!ctx) return;
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Convert the image to grayscale
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    console.log("imageData", imageData);
    const grayImageData = grayscale(imageData);
    // console.log("grayImageData", grayImageData);
    // Apply a Canny edge detection filter

    const edgeImageData = canny(grayImageData); //Should this return an ImageData?
    console.log("edgeImageData", edgeImageData);

    // draw edgeImageData to canvas
    const newImgData = ctx.createImageData(canvas.width, canvas.height);
    const pixels: number[] = [];
    for (let i = 0; i < newImgData.data.length; i += 1) {
      newImgData.data[i * 4] = edgeImageData[i];
      newImgData.data[i * 4 + 1] = edgeImageData[i];
      newImgData.data[i * 4 + 2] = edgeImageData[i];
      newImgData.data[i * 4 + 3] = 255;
    }
    newImgData.data.set(pixels);
    ctx.putImageData(newImgData, 0, 0);

    // Use a Hough transform to detect lines
    const lines = hough(
      edgeImageData,
      grayImageData.width,
      grayImageData.height
    );
    console.log("lines", lines);

    // Cluster the lines
    const lineGroups = cluster(lines, ctx);
    console.log("lineGroups", lineGroups);

    for (const line of lineGroups) {
      ctx.beginPath();
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
      ctx.strokeStyle = "red";
      ctx.stroke();
    }

    // Compute the intersections
    // const vertices = [];
    // // for (const group of lineGroups) {
    // const intersections = computeIntersections(lines);
    // vertices.push(...intersections);
    // // }

    // // Detect trapezoids
    // const trapezoids = detectTrapezoids(vertices);

    // // Draw the trapezoids on the original image
    // drawTrapezoids(canvas, trapezoids);
  };

  img.onerror = function (e, ee) {
    console.log("error loading image", e, ee);
  };

  img.src = "/img/grab1.png";

  function grayscale(imageData: ImageData) {
    console.log("grayscale before", imageData);
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
    console.log("grayscale after", grayImageData);
    return grayImageData;
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
          q = gradientData[y * width + x + 1];
          r = gradientData[y * width + x - 1];
        } else if (
          (direction >= Math.PI / 8 && direction < (3 * Math.PI) / 8) ||
          (direction >= (-7 * Math.PI) / 8 && direction < (-5 * Math.PI) / 8)
        ) {
          q = gradientData[(y + 1) * width + x + 1];
          r = gradientData[(y - 1) * width + x - 1];
        } else if (
          (direction >= (3 * Math.PI) / 8 && direction < (5 * Math.PI) / 8) ||
          (direction >= (-5 * Math.PI) / 8 && direction < (-3 * Math.PI) / 8)
        ) {
          q = gradientData[(y + 1) * width + x];
          r = gradientData[(y - 1) * width + x];
        } else {
          q = gradientData[(y + 1) * width + x - 1];
          r = gradientData[(y - 1) * width + x + 1];
        }
        const p = gradientData[y * width + x];
        if (p >= q && p >= r) {
          suppressedData[y * width + x] = p; // Only keep the strong edges
        }
      }
    }

    // Perform hysteresis thresholding
    const highThreshold = 0.08; // Adjust as needed. Maybe higher?
    const lowThreshold = 0.04; // Adjust as needed
    const edgeData = new Uint8ClampedArray(width * height);
    const highThresholdValue = Math.round(highThreshold * 255);
    const lowThresholdValue = Math.round(lowThreshold * 255);
    for (let i = 0; i < width * height; i++) {
      const value = Math.round(suppressedData[i]);
      if (value >= highThresholdValue) {
        // Strong edge
        edgeData[i] = 255;
      } else if (value < lowThresholdValue) {
        // Not an edge
        edgeData[i] = 0;
      } else {
        // Weak edge
        let isConnectedToStrongPixel = false;
        // Check if any of the neighboring pixels is a strong edge
        for (let y = -1; y <= 1; y++) {
          for (let x = -1; x <= 1; x++) {
            const neighborIndex = (i + y * width + x) * 4;
            if (suppressedData[neighborIndex / 4] >= highThresholdValue) {
              isConnectedToStrongPixel = true;
              break;
            }
          }
          if (isConnectedToStrongPixel) {
            break;
          }
        }
        if (isConnectedToStrongPixel) {
          edgeData[i] = 255;
        } else {
          edgeData[i] = 0;
        }
      }
    }

    return edgeData;
  }

  function hough(edgeData: Uint8ClampedArray, width: number, height: number) {
    const diagonalLength = Math.sqrt(width * width + height * height);
    const rhoMax = Math.ceil(diagonalLength);
    const thetaMax = 90;

    // Initialize accumulator array with zeros
    const accumulator = new Array(rhoMax * thetaMax).fill(0);

    // Loop through each edge pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (edgeData[y * width + x] > 0) {
          // Loop through each theta value from 0 to 90 degrees
          for (let theta = 0; theta < thetaMax; theta++) {
            const thetaRadians = (theta * Math.PI) / 180.0;

            // Compute rho value for this theta
            const rho = Math.round(
              x * Math.cos(thetaRadians) + y * Math.sin(thetaRadians)
            );

            //if this point is within 100 pixels of the edgeData pixel, increment the accumulator
            const x1 = Math.round(
              (rho - y * Math.sin(thetaRadians)) / Math.cos(thetaRadians)
            );
            const y1 = Math.round(
              (rho - x * Math.cos(thetaRadians)) / Math.sin(thetaRadians)
            );
            const distance = Math.sqrt(
              Math.pow(x - x1, 2) + Math.pow(y - y1, 2)
            );
            if (distance > 100) {
              continue;
            }
            // Increment accumulator for this (rho, theta) pair
            accumulator[rho * thetaMax + theta]++;
          }
        }
      }
    }

    return accumulator;
  }

  type LineSegment = {
    rho: number;
    theta: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    count: number;
  };
  type AverageSegment = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };

  function cluster(lines: number[], context: CanvasRenderingContext2D) {
    const threshold = 10; //Adjust this value to change the number of lines detected. Higher means less lines
    const thetaThreshold = 15; //Adjust this value to change the sesitivity of merging lines into clusters. Represents degree difference between theta values of lines

    const rhoMax = lines.length / 90;
    const lineSegments: LineSegment[] = [];

    // Loop through each (rho, theta) pair in the accumulator
    for (let rho = 0; rho < rhoMax; rho++) {
      for (let theta = 0; theta < 180; theta++) {
        const votes = lines[rho * 180 + theta];

        // Check if number of votes exceeds threshold
        if (votes >= threshold) {
          const thetaRadians = (theta * Math.PI) / 180.0;
          const a = Math.cos(thetaRadians);
          const b = Math.sin(thetaRadians);
          const x0 = a * rho;
          const y0 = b * rho;

          // Compute start and end points of line segment. Maybe this can be optimized?
          const lineLength = 100;
          const x1 = Math.round(x0 + lineLength * -b);
          const y1 = Math.round(y0 + lineLength * a);
          const x2 = Math.round(x0 - lineLength * -b);
          const y2 = Math.round(y0 - lineLength * a);

          // context.beginPath();
          // context.moveTo(x1, y1);
          // context.lineTo(x2, y2);
          // context.strokeStyle = "red";
          // context.stroke();

          // Check if line segment is similar to existing segments
          let foundMatch = false;
          for (let i = 0; i < lineSegments.length; i++) {
            const segment = lineSegments[i];

            // Check if segments are parallel and close together
            if (
              Math.abs(theta - segment.theta) < thetaThreshold &&
              Math.abs(rho - segment.rho) < 25
            ) {
              // Add to existing segment
              segment.x1 += x1;
              segment.y1 += y1;
              segment.x2 += x2;
              segment.y2 += y2;
              segment.count += 1;
              foundMatch = true;
              break;
            }
          }

          // If no matching segment found, create new segment
          if (!foundMatch) {
            lineSegments.push({
              rho: rho,
              theta: theta,
              x1: x1,
              y1: y1,
              x2: x2,
              y2: y2,
              count: 1,
            });
          }
        }
      }
    }

    // Compute average coordinates for each line segment
    const averagedSegments: AverageSegment[] = [];
    for (let i = 0; i < lineSegments.length; i++) {
      const segment = lineSegments[i];
      const count = segment.count;
      const x1 = Math.round(segment.x1 / count);
      const y1 = Math.round(segment.y1 / count);
      const x2 = Math.round(segment.x2 / count);
      const y2 = Math.round(segment.y2 / count);
      averagedSegments.push({ x1, y1, x2, y2 });
      console.log(averagedSegments[averagedSegments.length - 1]);
    }

    return averagedSegments;
  }

  // function computeIntersections(lines: AverageSegment[]) {
  //   return [];
  // }

  // function detectTrapezoids(vertices) {
  //   // TODO: Implement trapezoid detection
  // }

  // function drawTrapezoids(canvas, trapezoids) {
  //   // TODO: Implement trapezoid drawing
  // }
};
