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
  // Use the initial points to know the start and end? Somehow filter out from there? Using the genetic algorithm?

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

  console.log("organizedPoints 1 ", organizedPoints.length);

  // organizedPoints = removeDuplicates(organizedPoints);

  // console.log("organizedPoints 2 ", organizedPoints.length);

  let newPoints: Point[] = [];
  for (let i = 0; i < 5; i++) {
    const { points } = removeDuplicate([...organizedPoints]);
    newPoints = [...points];
  }
  console.log("organizedPoints 2 ", newPoints.length);

  // remove the last few points to make it a multiple of 4
  for (let i = 0; i < 5; i++) {
    if ([...newPoints].length % 4 === 0) {
      break;
    }
    const { points } = removeDuplicate(newPoints);
    newPoints = [...points];
  }

  organizedPoints = newPoints.length ? newPoints : organizedPoints;

  console.log("organizedPoints 3 ", organizedPoints.length);

  return {
    corners: organizedPoints,
    imageData: blackImage,
  };
}

function removeDuplicates(arr: Point[]): Point[] {
  let newArr = [];
  let index = Infinity;
  do {
    const { points, maxDerivativeIndex } = removeDuplicate(arr);
    newArr = points;
    index = maxDerivativeIndex;
    arr = newArr;
  } while (index > 5);
  return newArr;
}

function removeDuplicate(arr: Point[]): {
  points: Point[];
  maxDerivativeIndex: number;
} {
  // reduce dupicate points (points very close together)
  // first, find the distance between each points and sort by distance
  let distances = [];
  for (let i = 0; i < arr.length - 1; i++) {
    let distance = Math.sqrt(
      Math.pow(arr[i][0] - arr[i + 1][0], 2) +
        Math.pow(arr[i][1] - arr[i + 1][1], 2)
    );
    distances.push(distance);
  }
  // sort by distance
  distances = distances.map((d, i) => ({ d, i }));
  //find the smallest where the index is consecutive
  let smallest = {
    d: Infinity,
    i: 0,
  };
  for (let i = 0; i < distances.length - 1; i++) {
    if (distances[i + 1].d + distances[i].d < smallest.d) {
      smallest = { d: distances[i].d + distances[i + 1].d, i: i + 1 };
    }
  }

  // derivative of the distances - to find the greatest change
  // let derivative = [];
  // for (let i = 0; i < distances.length - 1; i++) {
  //   derivative.push(distances[i + 1].d - distances[i].d);
  // }

  // // find the greatest change over a window of 3
  // let maxDerivative = 0;
  // let maxDerivativeIndex = 0;
  // for (let i = 0; i < derivative.length - 2; i++) {
  //   let sum = derivative[i] + derivative[i + 1] + derivative[i + 2];
  //   if (sum > maxDerivative) {
  //     maxDerivative = sum;
  //     maxDerivativeIndex = i;
  //   }
  // }
  // if (maxDerivativeIndex <= 5) {
  //   return { points: arr, maxDerivativeIndex };
  // }
  console.log("smallest", smallest);
  console.log("arr", arr);
  console.log("d", distances);

  return {
    points: arr.filter((_, i) => i !== smallest.i),
    maxDerivativeIndex: 0,
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
