import { optionsStore } from "@data/globals";
import {
  Line,
  LineSegment,
  Point,
  Vertex,
} from "@SliceManager/TrapezoidalSliceManager/types";
import { Shape } from "@SliceManager/types";
type Shapeless = Omit<Shape, "id"> & {
  center: { x: number; y: number };
};

// y\ =\ 1\ -\ e^{-.05x}
const sigmoid = (x: number): number => {
  const val = 1 - Math.exp(-0.005 * x);
  //round to three digits
  return Math.round(val * 1000) / 1000;
};

const pickRandomItemFromArray = (array: any[]) => {
  return array[Math.floor(Math.random() * array.length)];
};

export const InitialGeneticAlgorithm = (
  points: [number, number][],
  edgeData: ImageData
): Line[][] => {
  const [options] = optionsStore;
  const boxSize = options.options.boxSize;
  const halfBox = boxSize / 2;
  const dataArray: Uint8ClampedArray = edgeData.data;
  const newArray: any[] = [];
  for (let i = 0; i < dataArray.length; i += 4) {
    newArray.push(dataArray[i]);
  }
  return points
    .map((point, i) => {
      // if (i < 3) return slice;
      const shape = geneticAlgorithm(
        {
          id: i,
          top: {
            x1: point[0] - halfBox,
            y1: point[1] - halfBox,
            x2: point[0] + halfBox,
            y2: point[1] - halfBox,
          },
          bottom: {
            x1: point[0] - halfBox,
            y1: point[1] + halfBox,
            x2: point[0] + halfBox,
            y2: point[1] + halfBox,
          },
          left: {
            x1: point[0] - halfBox,
            y1: point[1] - halfBox,
            x2: point[0] - halfBox,
            y2: point[1] + halfBox,
          },
          right: {
            x1: point[0] + halfBox,
            y1: point[1] - halfBox,
            x2: point[0] + halfBox,
            y2: point[1] + halfBox,
          },
          center: { x: point[0], y: point[1] },
        },
        newArray as unknown as Uint8ClampedArray,
        edgeData.width,
        boxSize
      );
      return getTrapezoid([
        [shape.left.x1, shape.left.y1],
        [shape.right.x1, shape.right.y1],
        [shape.right.x2, shape.right.y2],
        [shape.left.x2, shape.left.y2],
      ]);
    })
    .filter((shape) => shape !== null) as Line[][];
};

const geneticAlgorithm = (
  slice: Shape & {
    center: { x: number; y: number };
  },
  edgeData: Uint8ClampedArray,
  width: number,
  boxSize: number
): Shape => {
  const shapelessToShape = (
    shapeless: Shapeless
  ): Shape & {
    center: { x: number; y: number };
  } => {
    return {
      id: slice.id,
      top: shapeless.top,
      bottom: shapeless.bottom,
      left: {
        x1: shapeless.top.x1,
        y1: shapeless.top.y1,
        x2: shapeless.bottom.x1,
        y2: shapeless.bottom.y1,
      },
      right: {
        x1: shapeless.top.x2,
        y1: shapeless.top.y2,
        x2: shapeless.bottom.x2,
        y2: shapeless.bottom.y2,
      },
      center: slice.center,
    };
  };
  const fitnessFunction = (shape: Shapeless): number => {
    const points = getPointsOnTrapezoid({
      data: edgeData,
      trapezoid: shapelessToShape(shape),
      width,
      boxSize,
    });
    return sigmoid(points);
  };
  const mutate = (shape: Shapeless, x: number): Shapeless => {
    const boxArea = boxSize * boxSize;
    let area = 0;
    let trap: Shapeless | undefined;
    do {
      const topLeftX1 = shape.top.x1 + x * (Math.random() * 20 - 10);
      const topLeftY1 = shape.top.y1 + x * (Math.random() * 20 - 10);
      const topRightX1 = shape.top.x2 + x * (Math.random() * 20 - 10);
      const topRightY1 = shape.top.y2 + x * (Math.random() * 20 - 10);
      const bottomLeftX1 = shape.bottom.x1 + x * (Math.random() * 20 - 10);
      const bottomLeftY1 = shape.bottom.y1 + x * (Math.random() * 20 - 10);
      const bottomRightX1 = shape.bottom.x2 + x * (Math.random() * 20 - 10);
      const bottomRightY1 = shape.bottom.y2 + x * (Math.random() * 20 - 10);
      trap = {
        top: {
          x1: topLeftX1,
          y1: topLeftY1,
          x2: topRightX1,
          y2: topRightY1,
        },
        bottom: {
          x1: bottomLeftX1,
          y1: bottomLeftY1,
          x2: bottomRightX1,
          y2: bottomRightY1,
        },
        center: shape.center,
      };
      // check area, penalize if the area is too small
      area = calculateArea(shapelessToShape(trap));
    } while (area < boxArea * 0.3);
    return trap!;
  };
  const crossover = (shape1: Shapeless, shape2: Shapeless): Shapeless => {
    let area = 0;
    let trap: Shapeless | undefined;
    const boxArea = boxSize * boxSize;
    do {
      const topBottom = {
        top: {
          x1: Math.random() > 0.5 ? shape1.top.x1 : shape2.top.x1,
          y1: Math.random() > 0.5 ? shape1.top.y1 : shape2.top.y1,
          x2: Math.random() > 0.5 ? shape1.top.x2 : shape2.top.x2,
          y2: Math.random() > 0.5 ? shape1.top.y2 : shape2.top.y2,
        },
        bottom: {
          x1: Math.random() > 0.5 ? shape1.bottom.x1 : shape2.bottom.x1,
          y1: Math.random() > 0.5 ? shape1.bottom.y1 : shape2.bottom.y1,
          x2: Math.random() > 0.5 ? shape1.bottom.x2 : shape2.bottom.x2,
          y2: Math.random() > 0.5 ? shape1.bottom.y2 : shape2.bottom.y2,
        },
      };
      trap = {
        top: topBottom.top,
        bottom: topBottom.bottom,
        center: shape1.center,
      };
      area = calculateArea(shapelessToShape(trap));
    } while (area < boxArea * 0.3);
    return trap!;
  };
  const generateShape = (): Shapeless => {
    // generate a random shape based off the given slice
    return mutate(slice, 1.5);
  };
  const createGeneration = (): Shapeless[] => {
    return Array.from(Array(500), generateShape);
  };
  const loop = (): Shape => {
    let population = createGeneration();
    let i = 0;
    let x = 1; //learning variable
    let best = 0;
    let bestCounter = 0;
    while (i < 500) {
      i++;
      bestCounter++;
      population.sort((a, b) => {
        return fitnessFunction(b) - fitnessFunction(a);
      });
      if (fitnessFunction(population[0]) > best) {
        best = fitnessFunction(population[0]);
        bestCounter = 0;
      }
      //   if (bestCounter > 100 && x > 0.6) {
      //     x -= 0.1;
      //     console.log("x decreased to: ", x);
      //     bestCounter = 0;
      //   }
      if (bestCounter > 150) {
        console.log(
          i,
          "progress stopped at: ",
          population[0],
          fitnessFunction(population[0])
        );
        return shapelessToShape(population[0]);
      }
      const survivors = population.slice(0, 50);
      population = survivors.map((p, i) => {
        if (i < 25) return p;
        return mutate(survivors[i - 25], x);
      });
      for (let i = 0; i < 50; i++) {
        population.push(
          crossover(population[i], pickRandomItemFromArray(population))
        );
      }
      if (i % 200 === 0) {
        console.log(
          i,
          "best shape so far",
          population[0],
          fitnessFunction(population[0])
        );
      }
    }
    console.log(
      "failed to find valid shape",
      population[0],
      fitnessFunction(population[0])
    );
    return shapelessToShape(population[0]);
  };
  return loop();
};

const getPointsOnTrapezoid = ({
  data,
  width,
  trapezoid,
  boxSize,
}: {
  data: Uint8ClampedArray;
  trapezoid: Shape & {
    center: { x: number; y: number };
  };
  width: number;
  boxSize: number;
}): number => {
  const lines = [
    trapezoid.top,
    trapezoid.bottom,
    trapezoid.left,
    trapezoid.right,
  ];
  let points = 0;
  let checkedPoints = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const xStep = dx / length;
    const yStep = dy / length;
    let x = line.x1;
    let y = line.y1;
    for (let j = 0; j < length; j++) {
      checkedPoints++;
      if (
        !(
          x + xStep * j > 0 &&
          x + xStep * j < width &&
          y + yStep * j > 0 &&
          y + yStep * j < width
        )
      )
        continue;

      // check if any points are outsize the box area. If so, penalize
      // the shape by 4 points for each point outside the box
      if (x + xStep * j < trapezoid.center.x - boxSize / 2) {
        points -= 4;
      }
      if (x + xStep * j > trapezoid.center.x + boxSize / 2) {
        points -= 4;
      }
      if (y + yStep * j < trapezoid.center.y - boxSize / 2) {
        points -= 4;
      }
      if (y + yStep * j > trapezoid.center.y + boxSize / 2) {
        points -= 4;
      }

      if (
        data[Math.round(y + yStep * j) * width + Math.round(x + xStep * j)] ===
          255 ||
        data[
          Math.round(y + yStep * j) * width + Math.round(x + xStep * j + 1)
        ] === 255 ||
        data[
          Math.round(y + yStep * j) * width + Math.round(x + xStep * j - 1)
        ] === 255 ||
        data[
          Math.round(y + yStep * j + 1) * width + Math.round(x + xStep * j)
        ] === 255 ||
        data[
          Math.round(y + yStep * j - 1) * width + Math.round(x + xStep * j)
        ] === 255
      ) {
        points++;
      }
    }
  }

  return 20 * points - 19 * checkedPoints; //19x penalize bad points
};

function calculateArea(trapezoid: Shape): number {
  const a = Math.sqrt(
    (trapezoid.top.x1 - trapezoid.top.x2) ** 2 +
      (trapezoid.top.y1 - trapezoid.top.y2) ** 2
  );
  const b = Math.sqrt(
    (trapezoid.bottom.x1 - trapezoid.bottom.x2) ** 2 +
      (trapezoid.bottom.y1 - trapezoid.bottom.y2) ** 2
  );
  const c = Math.sqrt(
    (trapezoid.left.x1 - trapezoid.left.x2) ** 2 +
      (trapezoid.left.y1 - trapezoid.left.y2) ** 2
  );
  const d = Math.sqrt(
    (trapezoid.right.x1 - trapezoid.right.x2) ** 2 +
      (trapezoid.right.y1 - trapezoid.right.y2) ** 2
  );
  // Calculate the semiperimeter of the quadrilateral
  const s = (a + b + c + d) / 2;
  // Calculate the area using Brahmagupta's formula
  return Math.sqrt((s - a) * (s - b) * (s - c) * (s - d));
}

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
