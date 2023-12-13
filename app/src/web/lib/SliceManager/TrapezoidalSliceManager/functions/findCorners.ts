import * as signals from "@data/globals";
import { optionsStore } from "@data/globals";
import cv from "@techstark/opencv-js";

export function findCorners(p: {
  imageData: ImageData;
  imageContext: CanvasRenderingContext2D;
}): {
  corners: Point[];
  imageData: ImageData;
} {
  const [ribbonReducer, ribbonDispatch] = signals.ribbonState;
  let contours = ribbonReducer().contours;
  let imageData = p.imageData;
  if (!ribbonReducer().contours.length) {
    const { contours: tempContours, imageData: tempImageData } =
      detectContours(p);
    contours = tempContours;
    imageData = tempImageData;
    ribbonDispatch({
      action: "setContours",
      payload: contours,
    });
  }

  const simplifiedContours = straightenContours({ contours });
  const straightContourData = drawContours(
    imageData,
    simplifiedContours,
    new cv.Scalar(255, 255, 255, 255)
  );
  const blackImageData = new ImageData(
    straightContourData.width,
    straightContourData.height
  ).data.map((_, i) => {
    if (i % 4 === 3) return 255;
    return 0;
  });
  const blackData = new ImageData(
    blackImageData,
    straightContourData.width,
    straightContourData.height
  );
  const blackImage = drawContours(
    blackData,
    simplifiedContours,
    new cv.Scalar(255, 255, 255, 255)
  );

  const size = simplifiedContours.size();

  let largest = { area: 0, contour: simplifiedContours.get(0) };
  if (size > 1) {
    //find the right one
    for (let i = 0; i < size; i++) {
      const contour = simplifiedContours.get(i);
      const area = cv.contourArea(contour);
      if (largest === null || area > largest.area) {
        largest = { area, contour };
      }
    }
  }

  const lines = matVectorToArray(largest.contour);

  p.imageContext.putImageData(blackImage, 0, 0);
  let organizedPoints = [];
  for (const line of lines) {
    organizedPoints.push(line[0]);
  }

  return {
    corners: organizedPoints,
    imageData: blackImage,
  };
}

function straightenContours(p: { contours: cv.MatVector }): cv.MatVector {
  const [options] = optionsStore;
  const contourArray = Array.from({ length: p.contours.size() }, (_, i) =>
    p.contours.get(i)
  );
  const simplifiedContours = contourArray.map((contour) => {
    let approx = new cv.Mat();
    cv.approxPolyDP(contour, approx, options.options.sensitivity, true);
    return approx;
  });
  //convert from cv.Mat[] to cv.MatVector
  const simplifiedContour = matsToMatVector(simplifiedContours);
  return simplifiedContour;
}

function detectContours(p: { imageData: ImageData }): {
  contours: cv.MatVector;
  imageData: ImageData;
} {
  const mat = cv.matFromImageData(p.imageData);

  // Convert the image to grayscale
  cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);

  // Threshold the image to create a binary image
  cv.threshold(mat, mat, 128, 255, cv.THRESH_BINARY);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  try {
    cv.findContours(
      mat,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );
  } catch (e) {
    console.log("error", e);
  }
  return { contours, imageData: p.imageData };
}

function matsToMatVector(mats: cv.Mat[]): cv.MatVector {
  const matVector = new cv.MatVector();
  mats.forEach((mat) => matVector.push_back(mat));
  return matVector;
}

type Point = [number, number];
type Line = [Point, Point];
function contourToPoints(contour: cv.Mat): Line[] {
  let lines: Line[] = [];
  for (let i = 0; i < contour.rows; i++) {
    lines.push([
      contour.intPtr(i, 0),
      contour.intPtr((i + 1) % contour.rows, 0),
    ]);
  }
  return lines;
}

function matVectorToArray(matVector: cv.Mat): Line[] {
  let points: Line[] = [];
  points = contourToPoints(matVector);
  return points;
}

function drawContours(
  imageData: ImageData,
  contours: cv.MatVector,
  color: cv.Scalar
): ImageData {
  const mat = cv.matFromImageData(imageData);
  cv.drawContours(mat, contours, -1, color, 1);
  const newImgData = new Uint8ClampedArray(mat.data) as Uint8ClampedArray;
  return new ImageData(newImgData, imageData.width, imageData.height);
}
