import { Line, LineSegment, Point, Vertex } from "../types";

export const getValidSlices = (points: Point[]): Line[][] => {
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

  //order sets by area
  const sortedSets = sets.sort((a, b) => getArea(a) - getArea(b));

  //largest two will be valid sets
  const validSets = sortedSets.slice(0, 2);
  const expectedArea = (getArea(validSets[0]) + getArea(validSets[1])) / 2;

  //extrapolate correct order of points from valid sets
  //if (2,3,4,5) is valid, then (0,1,6,7) is also valid
  const allSets = generateSets(
    points.length - 1,
    validSets[0].map((p) => points.indexOf(p))
  );

  if (!allSets) return validSets.map(getTrapezoid) as Line[][];

  console.log(allSets);

  const mapped = allSets
    .map((set) => set.map((i) => points[i]))
    .filter((set) => Math.abs(getArea(set)) > expectedArea * 0.7);

  console.log(
    mapped,
    allSets.map((set) => set.map((i) => points[i])).map(getArea),
    getArea(validSets[1]),
    getTrapezoid(validSets[1])
  );

  //get trapezoids from valid sets
  const trapezoids = mapped.map(getTrapezoid);

  console.log(trapezoids);

  //return good sets
  const filtered = trapezoids.filter((t) => t !== null) as Line[][];
  return filtered;
  // if (filtered.length < points.length / 4) {
  //   return [...trapezoids, getTrapezoid(validSets[1].map(i => points[i]))!];

  // }
};

function generateSets(n: number, startSet: number[]): number[][] | null {
  // Validate inputs
  if (n < 3 || startSet.length !== 4) {
    return null;
  }

  const sets: number[][] = [startSet];
  const setCount = Math.floor((n + 1) / 4);
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
const pointToLine = (point: Point, point2: Point) => {
  if (!point || !point2) {
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
