import cv from "@techstark/opencv-js";
import { LineSegment, Vertex } from "../types";

export function straightenContours(p: {
  contours: cv.MatVector;
}): cv.MatVector {
  const contourArray = Array.from({ length: p.contours.size() }, (_, i) =>
    p.contours.get(i)
  );
  const simplifiedContours = contourArray.map((contour) => {
    let approx = new cv.Mat();
    cv.approxPolyDP(contour, approx, 3, true);
    return approx;
  });
  //convert from cv.Mat[] to cv.MatVector
  const simplifiedContour = matsToMatVector(simplifiedContours);
  return simplifiedContour;
}

export function detectCorners(p: { imageData: ImageData }): {
  corners: cv.Mat;
  imageData: ImageData;
} {
  const mat = cv.matFromImageData(p.imageData);

  // Convert the image to grayscale
  cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);

  // Threshold the image to create a binary image
  cv.threshold(mat, mat, 128, 255, cv.THRESH_BINARY);
  const corners = new cv.Mat();
  const maxCorners = 20; // Adjust the number of corners as needed
  cv.goodFeaturesToTrack(mat, corners, maxCorners, 0.0000001, 20);
  return { corners, imageData: p.imageData };
}

export function detectContours(p: { imageData: ImageData }): {
  contours: cv.MatVector;
  imageData: ImageData;
} {
  const mat = cv.matFromImageData(p.imageData);
  console.log("mat", mat);

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

// function pointsToContour(points: cv.Point[]): cv.Mat {
//   const contour = new cv.Mat(points.length, 1, cv.CV_32FC2);
//   for (let i = 0; i < points.length; i++) {
//     contour.data32F[i * 2] = points[i].x;
//     contour.data32F[i * 2 + 1] = points[i].y;
//   }
//   return contour;
// }
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

export function matVectorToArray(matVector: cv.Mat): Line[] {
  let points: Line[] = [];
  points = contourToPoints(matVector);
  return points;
}

export function drawCorners(p: {
  imageData: ImageData;
  corners: cv.Mat;
}): ImageData {
  const mat = cv.matFromImageData(p.imageData);

  const corners = p.corners;

  for (let i = 0; i < corners.rows; i++) {
    const point = new cv.Point(
      corners.data32F[i * 2],
      corners.data32F[i * 2 + 1]
    );
    cv.circle(mat, point, 5, new cv.Scalar(255, 0, 0, 255), -1); // Draw a filled blue circle at each corner
  }

  // Convert the Mat back to ImageData
  const newImgData = new Uint8ClampedArray(mat.data) as Uint8ClampedArray;
  return new ImageData(newImgData, p.imageData.width, p.imageData.height);
}

export function drawContours(
  imageData: ImageData,
  contours: cv.MatVector,
  color: cv.Scalar
): ImageData {
  const mat = cv.matFromImageData(imageData);
  cv.drawContours(mat, contours, -1, color, 1);
  const newImgData = new Uint8ClampedArray(mat.data) as Uint8ClampedArray;
  return new ImageData(newImgData, imageData.width, imageData.height);
}

export function cornerHarrisDetection(
  inputImage: ImageData,
  blockSize: number,
  ksize: number,
  k: number,
  threshold: number
): cv.Mat {
  const mat = cv.matFromImageData(inputImage);

  // Convert the input image to grayscale
  const grayImage = new cv.Mat();
  cv.cvtColor(mat, grayImage, cv.COLOR_RGBA2GRAY);

  // Compute Harris corners
  const corners = new cv.Mat();
  cv.cornerHarris(grayImage, corners, blockSize, ksize, k);

  // Normalize and apply a threshold to obtain the corner map
  const cornerMap = new cv.Mat();
  cv.normalize(corners, cornerMap, 0, 255, cv.NORM_MINMAX, cv.CV_32F);

  // Create a binary image where corners are marked
  const binaryMap = new cv.Mat();
  cv.threshold(cornerMap, binaryMap, threshold, 255, cv.THRESH_BINARY);

  // Release allocated memory
  grayImage.delete();
  corners.delete();
  cornerMap.delete();

  return binaryMap;
}

const area = (points: Line[]) => {
  //A=1/2 * (x1y2+x2y3+x3y4+x4y1−x2y1−x3y2−x4y3−x1y4)
  return (
    0.5 *
    (points[0][0][0] * points[0][1][1] +
      points[1][0][0] * points[1][1][1] +
      points[2][0][0] * points[2][1][1] +
      points[3][0][0] * points[3][1][1] -
      points[0][1][0] * points[0][0][1] -
      points[1][1][0] * points[1][0][1] -
      points[2][1][0] * points[2][0][1] -
      points[3][1][0] * points[3][0][1])
  );
};
// const linesToTrapezoid = (lines: Line[]) => {
//   return {
//     top: pointToLine(lines[0][0], lines[0][1]),
//     right: pointToLine(lines[1][0], lines[1][1]),
//     bottom: pointToLine(lines[2][0], lines[2][1]),
//     left: pointToLine(lines[3][0], lines[3][1]),
//     id: 0,
//   };
// };
const pointToLine = (point: Point, point2: Point) => {
  if (!point || !point2) {
    console.log("pointToLine", { point, point2 });
    return { x1: 0, y1: 0, x2: 0, y2: 0 };
  }
  return {
    x1: point[0],
    y1: point[1],
    x2: point2[0],
    y2: point2[1],
  };
};

// divide a set of points into groups of 4, where each group has a similar area
// sum of all areas should be equal to the area of the whole set

const getArea = (points: Point[]) => {
  const trapezoid = getTrapezoid(points);
  if (!trapezoid) return -1;
  const areas = area(trapezoid);
  return areas;
};

const getTrapezoidIntersects = (Lines: Line[]) => {
  for (let i = 0; i < Lines.length; i++) {
    const line1 = Lines[i];
    for (let j = i + 1; j < Lines.length; j++) {
      const line2 = Lines[j];
      const intersect = intersectionPoint(
        pointToLine(line1[0], line1[1]),
        pointToLine(line2[0], line2[1])
      );
      if (intersect) {
        return true;
      }
    }
  }
  return false;
};

const getTrapezoid = (points: Point[]): Line[] | null => {
  let trapezoid: Line[] = [
    [points[0], points[1]],
    [points[1], points[2]],
    [points[2], points[3]],
    [points[3], points[0]],
  ];
  if (!getTrapezoidIntersects(trapezoid)) {
    return trapezoid;
  }
  trapezoid = [
    [points[0], points[1]],
    [points[1], points[3]],
    [points[3], points[2]],
    [points[2], points[0]],
  ];
  if (!getTrapezoidIntersects(trapezoid)) {
    return trapezoid;
  }
  trapezoid = [
    [points[0], points[2]],
    [points[2], points[1]],
    [points[1], points[3]],
    [points[3], points[0]],
  ];
  if (!getTrapezoidIntersects(trapezoid)) {
    return null;
  } else return trapezoid;
};

// const getAverageArea = (points: Point[]) => {
//   const area = getArea(points);
//   return area / points.length;
// };

// //given a set of many points, estimate total area
// const getTotalAreaEstimate = (points: Point[]) => {
//   //find two sets of 2 points that are farthest apart
//   let maxDistance = 0;
//   let maxDistancePoints: [Point, Point] = [points[0], points[1]];
//   for (let i = 0; i < points.length; i++) {
//     const a = points[i];
//     for (let j = i + 1; j < points.length; j++) {
//       const b = points[j];
//       const distance = distanceBetweenPoints(a, b);
//       if (distance > maxDistance) {
//         maxDistance = distance;
//         maxDistancePoints = [a, b];
//       }
//     }
//   }
//   //find two sets of 2 points that are farthest apart
//   let minDistance = Infinity;
//   let minDistancePoints: [Point, Point] = [points[0], points[1]];
//   for (let i = 0; i < points.length; i++) {
//     const a = points[i];
//     for (let j = i + 1; j < points.length; j++) {
//       const b = points[j];
//       const distance = distanceBetweenPoints(a, b);
//       if (distance < minDistance) {
//         minDistance = distance;
//         minDistancePoints = [a, b];
//       }
//     }
//   }
//   const area = getArea([...maxDistancePoints, ...minDistancePoints]);
//   return area;
// };

// const distanceBetweenPoints = (a: Point, b: Point) => {
//   return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
// };

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

  //if endpoints are the same, they don't intersect
  if (
    (x1 === x3 && y1 === y3) ||
    (x1 === x4 && y1 === y4) ||
    (x2 === x3 && y2 === y3) ||
    (x2 === x4 && y2 === y4)
  ) {
    return null;
  }
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

export const testPoints = (points: Point[]): Line[][] => {
  // create sets of every 4 consecutive points: [0,1,2,3], [1,2,3,4], [2,3,4,5], etc
  const sets = [];
  for (let i = 0; i < points.length - 3; i++) {
    sets.push(points.slice(i, i + 4));
  }
  sets.push([
    points[points.length - 3],
    points[points.length - 2],
    points[points.length - 1],
    points[0],
  ]);
  sets.push([
    points[points.length - 2],
    points[points.length - 1],
    points[0],
    points[1],
  ]);
  sets.push([points[points.length - 1], points[0], points[1], points[2]]);

  //get area of each set
  const areas = sets.map(getArea);
  console.log(
    "areas",
    areas.sort((a, b) => a - b)
  );

  //order sets by area
  const sortedSets = sets.sort((a, b) => getArea(a) - getArea(b));
  //largest two will be valid sets
  const validSets = sortedSets.slice(0, 2);
  console.log("validSets", validSets);

  //extrapolate correct order of points from valid sets
  //if (2,3,4,5) is valid, then (0,1,6,7) is also valid
  const allSets = generateSets(
    points.length - 1,
    validSets[0].map((p) => points.indexOf(p))
  );

  if (!allSets) return validSets.map(getTrapezoid) as Line[][];

  const trapezoids = allSets
    .map((set) => set.map((i) => points[i]))
    .map(getTrapezoid);

  console.log("trapezoids", trapezoids);
  //return good sets
  return trapezoids.filter((t) => t !== null) as Line[][];
};

function generateSets(n: number, startSet: number[]): number[][] | null {
  // Validate inputs
  if (n < 3 || (n + 1) % 4 !== 0 || startSet.length !== 4) {
    console.log("generateSets", { n, startSet });
    console.log("Invalid input parameters");
    return null;
  }

  const sets: number[][] = [startSet];
  const setCount = (n + 1) / 4;
  let startPointer = startSet[0];
  let endPointer = startSet[3];

  // Function to get the next set of 4 consecutive points
  const getNextSet = (
    startIndex: number,
    endIndex: number,
    n: number
  ): {
    set: number[];
    startIndex: number;
    endIndex: number;
  } => {
    const set: number[] = [];
    startIndex = startIndex - 1 === -1 ? n : startIndex - 1;
    set.push(startIndex);
    startIndex = startIndex - 1 === -1 ? n : startIndex - 1;
    set.push(startIndex);

    endIndex = endIndex + 1 === n + 1 ? 0 : endIndex + 1;
    set.push(endIndex);
    endIndex = endIndex + 1 === n + 1 ? 0 : endIndex + 1;
    set.push(endIndex);
    console.log("set", { set, startIndex, endIndex });
    return { set, startIndex, endIndex };
  };

  // Generate additional sets until reaching the required count
  for (let i = 1; i < setCount; i++) {
    const { set, startIndex, endIndex } = getNextSet(
      startPointer,
      endPointer,
      n
    );
    startPointer = startIndex;
    endPointer = endIndex;
    sets.push(set);
  }

  return sets;
}
