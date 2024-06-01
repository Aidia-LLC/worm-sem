import { Shape } from "@SliceManager/types";
type Shapeless = Omit<Shape, "id">;

// y\ =\ 1\ -\ e^{-.05x}
const sigmoid = (x: number): number => {
  const val = 1 - Math.exp(-0.005 * x);
  //round to three digits
  return Math.round(val * 1000) / 1000;
};

const pickRandomItemFromArray = (array: any[]) => {
  return array[Math.floor(Math.random() * array.length)];
};

export const GeneticAlgorithm = (
  slices: Shape[],
  edgeData: ImageData
): Shape[] => {
  const dataArray: Uint8ClampedArray = edgeData.data;
  const newArray: any[] = [];
  for (let i = 0; i < dataArray.length; i += 4) {
    newArray.push(dataArray[i]);
  }
  console.log("slices", slices.length);
  return slices.map((slice) => {
    // if (i < 3) return slice;
    return geneticAlgorithm(
      slice,
      newArray as unknown as Uint8ClampedArray,
      edgeData.width
    );
  });
};

const geneticAlgorithm = (
  slice: Shape,
  edgeData: Uint8ClampedArray,
  width: number
): Shape => {
  const shapelessToShape = (shapeless: Shapeless): Shape => {
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
    };
  };
  const fitnessFunction = (shape: Shapeless, log?: boolean): number => {
    const points = getPointsOnTrapezoid({
      data: edgeData,
      trapezoid: shapelessToShape(shape),
      width,
      log: log,
    });
    return sigmoid(points);
  };
  const mutate = (shape: Shapeless, x: number): Shapeless => {
    const topLeftX1 = shape.top.x1 + x * (Math.random() * 20 - 10);
    const topLeftY1 = shape.top.y1 + x * (Math.random() * 20 - 10);
    const topRightX1 = shape.top.x2 + x * (Math.random() * 20 - 10);
    const topRightY1 = shape.top.y2 + x * (Math.random() * 20 - 10);
    const bottomLeftX1 = shape.bottom.x1 + x * (Math.random() * 20 - 10);
    const bottomLeftY1 = shape.bottom.y1 + x * (Math.random() * 20 - 10);
    const bottomRightX1 = shape.bottom.x2 + x * (Math.random() * 20 - 10);
    const bottomRightY1 = shape.bottom.y2 + x * (Math.random() * 20 - 10);
    return {
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
    };
  };
  const crossover = (shape1: Shapeless, shape2: Shapeless): Shapeless => {
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
    return {
      top: topBottom.top,
      bottom: topBottom.bottom,
    };
  };
  const generateShape = (x?: number): Shapeless => {
    // generate a random shape based off the given slice
    return mutate(slice, x || 1);
  };
  const createGeneration = (): Shapeless[] => {
    return Array.from(Array(1000), generateShape);
  };
  const loop = (): Shape => {
    let population = createGeneration();
    let i = 0;
    let x = 1; //learning variable
    while (i < 100) {
      i++;
      population.sort((a, b) => {
        return fitnessFunction(b) - fitnessFunction(a);
      });
      if (fitnessFunction(population[0]) === 1) {
        console.log(
          i,
          "found valid shape",
          population[0],
          fitnessFunction(population[0], true)
        );
        return shapelessToShape(population[0]);
      }
      const survivors = population.slice(0, 500);
      population = survivors.map((p, i) => {
        if (i < 250) return p;
        return mutate(survivors[i - 250], x);
      });
      for (let i = 0; i < 500; i++) {
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
  log,
}: {
  data: Uint8ClampedArray;
  trapezoid: Shape;
  width: number;
  log?: boolean;
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
  return 2 * points - checkedPoints;
};
