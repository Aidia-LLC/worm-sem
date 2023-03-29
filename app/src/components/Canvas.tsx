import { createEffect, createSignal, onMount, untrack } from "solid-js";
import { Button } from "./Button";

const Param = (props: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => {
  const [currentValue, setCurrentValue] = createSignal(props.value);

  createEffect(() => {
    const propValue = props.value;
    untrack(() => {
      if (propValue !== currentValue()) setCurrentValue(props.value);
    });
  });

  let inputRef!: HTMLInputElement;

  return (
    <div class="flex flex-row items-center gap-2">
      <label class="font-bold">{props.label}</label>
      <input
        type="number"
        value={props.value}
        class="w-full"
        ref={inputRef}
        onChange={(e) => setCurrentValue(parseFloat(e.currentTarget.value))}
      />
      <button
        onClick={() => props.onChange(currentValue())}
        class="text-white font-bold py-2 px-4 rounded"
        classList={{
          "bg-orange-500 hover:bg-orange-700": props.value !== currentValue(),
          "bg-blue-500 hover:bg-blue-700": props.value === currentValue(),
        }}
      >
        Set
      </button>
    </div>
  );
};

const KernelParam = (props: {
  values: number[];
  onChange: (values: number[]) => void;
}) => {
  const [cornerVal, setCornerVal] = createSignal(props.values[0]);
  const [edgeVal, setEdgeVal] = createSignal(props.values[1]);
  const [centerVal, setCenterVal] = createSignal(props.values[2]);

  let corners!: HTMLInputElement;
  let edges!: HTMLInputElement;
  let center!: HTMLInputElement;

  createEffect(() => {
    const [latestCorner, latestEdge, latestCenter] = props.values;
    untrack(() => {
      if (latestCorner !== cornerVal()) setCornerVal(props.values[0]);
      if (latestEdge !== edgeVal()) setEdgeVal(props.values[1]);
      if (latestCenter !== centerVal()) setCenterVal(props.values[2]);
    });
  });

  const changed = () => {
    return (
      cornerVal() !== props.values[0] ||
      edgeVal() !== props.values[1] ||
      centerVal() !== props.values[2]
    );
  };

  return (
    <div class="flex flex-row items-center gap-2">
      <label class="font-bold">Gaussian Kernel</label>
      <div class="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, index) => {
          if (index === 0 || index === 1 || index === 4) {
            return (
              <input
                type="number"
                class="text-center"
                value={
                  index === 0
                    ? cornerVal()
                    : index === 4
                    ? centerVal()
                    : edgeVal()
                }
                ref={index === 0 ? corners : index === 4 ? center : edges}
                onChange={(e) => {
                  if (index === 0)
                    setCornerVal(parseFloat(e.currentTarget.value));
                  if (index === 1)
                    setEdgeVal(parseFloat(e.currentTarget.value));
                  if (index === 4)
                    setCenterVal(parseFloat(e.currentTarget.value));
                }}
              />
            );
          }
          return (
            <div class="flex items-center justify-center">
              {index % 2 === 1
                ? edgeVal()
                : index === 4
                ? centerVal()
                : cornerVal()}
            </div>
          );
        })}
      </div>
      <button
        onClick={() => {
          props.onChange([cornerVal(), edgeVal(), centerVal()]);
        }}
        class="text-white font-bold py-2 px-4 rounded"
        classList={{
          "bg-orange-500 hover:bg-orange-700": changed(),
          "bg-blue-500 hover:bg-blue-700": !changed(),
        }}
      >
        Set
      </button>
    </div>
  );
};

const defaultOptions: Options = {
  squareSize: 80,
  gaussianKernel: [1 / 16, 1 / 8, 1 / 4],
  hysteresisHigh: 0.075,
  hysteresisLow: 0.0275,
  minNeighborsForNoiseReduction: 6,
  houghVoteThreshold: 0.65,
  mergeThetaThreshold: 10,
  pixelThreshold: 0.35,
  maxLines: 6,
  noiseReductionIterations: 15,
  densityThreshold: .3,
  densityStep: 2,
  densitySize: 16,
};

export const Canvas = () => {
  let canvasRef!: HTMLCanvasElement;

  const [refresh, setRefresh] = createSignal(0);
  const [squareSize, setSquareSize] = createSignal(defaultOptions.squareSize);
  const [gaussianKernel, setGaussianKernel] = createSignal<
    [number, number, number]
  >(defaultOptions.gaussianKernel);
  const [hysteresisHigh, setHysteresisHigh] = createSignal(
    defaultOptions.hysteresisHigh
  );
  const [hysteresisLow, setHysteresisLow] = createSignal(
    defaultOptions.hysteresisLow
  );
  const [minNeighborsForNoiseReduction, setMinNeighborsForNoiseReduction] =
    createSignal(defaultOptions.minNeighborsForNoiseReduction);
  const [houghVoteThreshold, setHoughVoteThreshold] = createSignal(
    defaultOptions.houghVoteThreshold
  );
  const [mergeThetaThreshold, setMergeThetaThreshold] = createSignal(
    defaultOptions.mergeThetaThreshold
  );
  const [pixelThreshold, setPixelThreshold] = createSignal(
    defaultOptions.pixelThreshold
  );
  const [noiseReductionIterations, setNoiseReductionIterations] = createSignal(
    defaultOptions.noiseReductionIterations
  );
  const [maxLines, setMaxLines] = createSignal(defaultOptions.maxLines);
  const [points, setPoints] = createSignal<[number, number][]>([]);
  const [densityThreshold, setDensityThreshold] = createSignal(defaultOptions.densityThreshold);
  const [densityStep, setDensityStep] = createSignal(defaultOptions.densityStep);
  const [densitySize, setDensitySize] = createSignal(defaultOptions.densitySize);

  const options = () => ({
    squareSize: squareSize(),
    gaussianKernel: gaussianKernel(),
    hysteresisHigh: hysteresisHigh(),
    hysteresisLow: hysteresisLow(),
    minNeighborsForNoiseReduction: minNeighborsForNoiseReduction(),
    houghVoteThreshold: houghVoteThreshold(),
    mergeThetaThreshold: mergeThetaThreshold(),
    pixelThreshold: pixelThreshold(),
    maxLines: maxLines(),
    noiseReductionIterations: noiseReductionIterations(),
    densityThreshold: densityThreshold(),
    densityStep: densityStep(),
    densitySize: densitySize(),
  });

  const handleClick = (e: MouseEvent) => {
    const ctx = canvasRef.getContext("2d")!;
    const rect = canvasRef.getBoundingClientRect();
    const rectWidth = rect.right - rect.left;
    const rectHeight = rect.bottom - rect.top;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imgX = Math.round((x / rectWidth) * canvasRef.width);
    const imgY = Math.round((y / rectHeight) * canvasRef.height);
    setPoints([...points(), [imgX, imgY]]);
    detectTrapezoids(imgX, imgY, ctx, options());
  };

  createEffect(async () => {
    console.log("refreshing");
    refresh();
    const o = options();
    await setupCanvas(canvasRef, o);
    untrack(() => {
      const ctx = canvasRef.getContext("2d")!;
      for (const [x, y] of points()) detectTrapezoids(x, y, ctx, o);
    });
  });

  onMount(() => {
    canvasRef.addEventListener("click", handleClick);
  });

  return (
    <div class="flex flex-col gap-3 text-xs">
      <h3 class="font-bold text-xl mt-4">Canvas</h3>
      <Button
        onClick={() => {
          setSquareSize(defaultOptions.squareSize);
          setGaussianKernel(defaultOptions.gaussianKernel);
          setHysteresisHigh(defaultOptions.hysteresisHigh);
          setHysteresisLow(defaultOptions.hysteresisLow);
          setMinNeighborsForNoiseReduction(
            defaultOptions.minNeighborsForNoiseReduction
          );
          setHoughVoteThreshold(defaultOptions.houghVoteThreshold);
          setMergeThetaThreshold(defaultOptions.mergeThetaThreshold);
          setPixelThreshold(defaultOptions.pixelThreshold);
          setMaxLines(defaultOptions.maxLines);
          setNoiseReductionIterations(defaultOptions.noiseReductionIterations);
        }}
      >
        Reset Parameters
      </Button>
      <div class="grid grid-cols-2 gap-3">
        <Param
          label="Square Size"
          value={squareSize()}
          onChange={setSquareSize}
        />
        <Param
          label="Min Neighbors for Noise Reduction"
          value={minNeighborsForNoiseReduction()}
          onChange={setMinNeighborsForNoiseReduction}
        />
        <Param
          label="Hysteresis Low"
          value={hysteresisLow()}
          onChange={setHysteresisLow}
        />
        <Param
          label="Hysteresis High"
          value={hysteresisHigh()}
          onChange={setHysteresisHigh}
        />
        <Param
          label="Hough Vote Threshold"
          value={houghVoteThreshold()}
          onChange={setHoughVoteThreshold}
        />
        <Param
          label="Merge Theta Threshold"
          value={mergeThetaThreshold()}
          onChange={setMergeThetaThreshold}
        />
        <Param
          label="Pixels Per Line Percentage Threshold"
          value={pixelThreshold()}
          onChange={setPixelThreshold}
        />
        <Param
          label="Max Lines Per Square"
          value={maxLines()}
          onChange={setMaxLines}
        />
        <Param
          label="Noise Reduction Iterations"
          value={noiseReductionIterations()}
          onChange={setNoiseReductionIterations}
        />
        <Param
          label="Density Threshold"
          value={densityThreshold()}
          onChange={setDensityThreshold}
        />
        <Param
          label="Density Step"
          value={densityStep()}
          onChange={setDensityStep}
        />
        <Param
          label="Density Size"
          value={densitySize()}
          onChange={setDensitySize}
        />
      </div>
      <KernelParam values={gaussianKernel()} onChange={setGaussianKernel} />
      <Button
        onClick={() => {
          setPoints([]);
          setRefresh(refresh() + 1);
        }}
      >
        Clear Squares
      </Button>
      <canvas ref={canvasRef} id="canvas" width="1000" height="1000"></canvas>
    </div>
  );
};

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

export const setupCanvas = (
  canvas: HTMLCanvasElement,
  options: Options
): Promise<void> => {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const img = new Image();

  return new Promise((res) => {
    img.onload = function () {
      if (!ctx) return;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const grayImageData = grayscale(imageData, ctx);

      //Apply a gausian blur
      const blurImageData1 = gaussianBlur(grayImageData, ctx, options);
      const blurImageData = gaussianBlur(blurImageData1, ctx, options);

      ctx.putImageData(blurImageData, 0, 0);

      const Noisy = canny(blurImageData, options);
      const Weak = RemoveNoise(Noisy, blurImageData.width, blurImageData.height, options);
      const edgeData = ConnectStrongEdges(Weak, blurImageData.width, blurImageData.height);
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
      colorPixelsByDensity(ctx, canvas, options)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data.filter((_, i) => i % 4 === 0);
      const betterData = ConnectStrongEdges2(data, canvas.width, canvas.height);
      const betterStuff = new Uint8ClampedArray(canvas.width * canvas.height * 4);
      for (let i = 0; i < betterData.length; i += 1) {
        betterStuff[i * 4] = betterData[i] > 1 ? 255 : 0;
        betterStuff[i * 4 + 1] = betterData[i] > 1 ? 255 : 0;
        betterStuff[i * 4 + 2] = betterData[i] > 1 ? 255 : 0;
        betterStuff[i * 4 + 3] = 255;
      }
      newImageData.data.set(betterStuff);
      res();
    };
    img.src = "/img/grab1.png";
  });
};

function colorPixelsByDensity(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, options: Options) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  // loop through every 5 pixels, scan a 5x5 square around it
  for (let x = 0; x < canvas.width; x += options.densityStep) {
    for (let y = 0; y < canvas.height; y += options.densityStep) {
      const square = getSquare(imageData, Math.round(x), y, options.densitySize);
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

function detectTrapezoids(
  x: number,
  y: number,
  ctx: CanvasRenderingContext2D,
  options: Options
) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  // get a square of pixels around the clicked point
  const square = getSquare(imageData, x, y, options.squareSize);
  // draw and fill the square pixels red
  ctx.beginPath();
  ctx.rect(
    x - options.squareSize / 2,
    y - options.squareSize / 2,
    options.squareSize,
    options.squareSize
  );
  ctx.strokeStyle = "red";
  ctx.stroke();
  ctx.closePath();

  const lines = hough(square, options);

  const goodLines = pixelsPerLine(lines, square, options);
  // draw each line
  for (const line of goodLines) {
    ctx.beginPath();
    ctx.moveTo(
      line.x1 + x - options.squareSize / 2,
      line.y1 + y - options.squareSize / 2
    );
    ctx.lineTo(
      line.x2 + x - options.squareSize / 2,
      line.y2 + y - options.squareSize / 2
    );
    ctx.strokeStyle = "red";
    ctx.stroke();
  }
  const vertices = computeVertices(goodLines).map((vertex) => ({x: vertex.x + x - options.squareSize / 2, y: vertex.y + y - options.squareSize / 2}));

  // drawVertices(vertices, ctx);

  const trapezoid: Trapezoid = computeTrapezoid(vertices, ctx);
  const newTrapezoid = DirectSearchOptimization(getPointsOnTrapezoid, trapezoid, square, options, ctx, x, y);
  console.log([newTrapezoid])
  ctx.beginPath();
  ctx.moveTo(newTrapezoid.top.x1, newTrapezoid.top.y1);
  ctx.lineTo(newTrapezoid.top.x2, newTrapezoid.top.y2);
  ctx.lineTo(newTrapezoid.bottom.x2, newTrapezoid.bottom.y2);
  ctx.lineTo(newTrapezoid.bottom.x1, newTrapezoid.bottom.y1);
  ctx.lineTo(newTrapezoid.top.x1, newTrapezoid.top.y1);
  ctx.strokeStyle = "red";
  ctx.stroke();
  ctx.rect(newTrapezoid.top.x1, newTrapezoid.top.y1, 2, 2);
  ctx.rect(newTrapezoid.bottom.x1, newTrapezoid.bottom.y1, 2, 2);
  ctx.rect(newTrapezoid.top.x2, newTrapezoid.top.y2, 2, 2);
  ctx.rect(newTrapezoid.bottom.x2, newTrapezoid.bottom.y2, 2, 2);
  ctx.fillStyle = "red";
  ctx.fill();
  ctx.closePath();

  // const test = RANSAC(ctx, getSquare(imageData, x, y - options.squareSize * .75, options.squareSize), calculateArea(trapezoid), options, x - options.squareSize / 2, y - (options.squareSize / 2) - options.squareSize * .75);
  // ctx.beginPath();
  // ctx.rect(x - options.squareSize / 2, y - options.squareSize / 2 - options.squareSize * .75, options.squareSize, options.squareSize);
  // ctx.strokeStyle = "red";
  // ctx.stroke();
  // ctx.closePath();
  // console.log("test", test);
  // const connectedTrapezoids = findConnectedTrapezoids(trapezoid, ctx, x, y, options.squareSize + 20, options);
  // console.log("connectedTrapezoids", connectedTrapezoids);
  // drawConnectedTrapezoids(connectedTrapezoids, ctx);
}

function calculateArea(trapezoid: Trapezoid): number {
  const a = Math.sqrt((trapezoid.top.x1 - trapezoid.top.x2) ** 2 + (trapezoid.top.y1 - trapezoid.top.y2) ** 2);
  const b = Math.sqrt((trapezoid.bottom.x1 - trapezoid.bottom.x2) ** 2 + (trapezoid.bottom.y1 - trapezoid.bottom.y2) ** 2);
  const c = Math.sqrt((trapezoid.left.x1 - trapezoid.left.x2) ** 2 + (trapezoid.left.y1 - trapezoid.left.y2) ** 2);
  const d = Math.sqrt((trapezoid.right.x1 - trapezoid.right.x2) ** 2 + (trapezoid.right.y1 - trapezoid.right.y2) ** 2);
  // Calculate the semiperimeter of the quadrilateral
  const s = (a + b + c + d) / 2;

  // Calculate the area using Brahmagupta's formula
  const area1 = Math.sqrt((s - a) * (s - b) * (s - c) * (s - d));

  const a2 = Math.sqrt((trapezoid.top.x1 - trapezoid.top.x2) ** 2 + (trapezoid.top.y1 - trapezoid.top.y2) ** 2);
  const b2 = Math.sqrt((trapezoid.bottom.x1 - trapezoid.bottom.x2) ** 2 + (trapezoid.bottom.y1 - trapezoid.bottom.y2) ** 2);
  const c2 = Math.sqrt((trapezoid.left.x1 - trapezoid.left.x2) ** 2 + (trapezoid.left.y1 - trapezoid.left.y2) ** 2);
  const d2 = Math.sqrt((trapezoid.right.x1 - trapezoid.right.x2) ** 2 + (trapezoid.right.y1 - trapezoid.right.y2) ** 2);
  // Calculate the semiperimeter of the quadrilateral
  const s2 = (a2 + b2 + c2 + d2) / 2;

  // Calculate the area using Brahmagupta's formula
  const area2 = Math.sqrt((s2 - a2) * (s2 - b2) * (s2 - c2) * (s2 - d2));

  return Math.max(area1, area2);
}

// function findConnectedTrapezoids(trapezoid: Trapezoid, ctx: CanvasRenderingContext2D, x: number, y: number, squareSize: number, options: Options) {
//   // check for trapezoids recursively in the 4 directions
//   let trapezoids: Trapezoid[] = [];
//   recurseSearchTrapezoid(x, y, 0, -squareSize, trapezoid, ctx, options, trapezoids)?.forEach((t) => trapezoids.push(t));
//   recurseSearchTrapezoid(x, y, 0, squareSize, trapezoid, ctx, options, trapezoids)?.forEach((t) => trapezoids.push(t));
//   recurseSearchTrapezoid(x, y, -squareSize, 0, trapezoid, ctx, options, trapezoids)?.forEach((t) => trapezoids.push(t));
//   recurseSearchTrapezoid(x, y, squareSize, 0, trapezoid, ctx, options, trapezoids)?.forEach((t) => trapezoids.push(t));
//   return trapezoids;
// }

// function recurseSearchTrapezoid(x: number, y: number, deltaX: number, deltaY:number, trapezoid: any, ctx: CanvasRenderingContext2D, options: Options, trapezoids: Trapezoid[]) {
//   if(!trapezoid || !deltaX || !deltaY) return trapezoids
//   const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
//   // get a square of pixels around the clicked point
//   const square = getSquare(imageData, x + deltaX, y + deltaY, options.squareSize);
//   const nextTrapezoid = RANSAC(ctx, square, trapezoid);
//   if (nextTrapezoid) {
//     trapezoids.push(nextTrapezoid);
//     recurseSearchTrapezoid(x + deltaX, y + deltaY, deltaX, deltaY, nextTrapezoid, ctx, options, trapezoids);
//   }
// }

function RANSAC(ctx: CanvasRenderingContext2D, edgePixels: Uint8ClampedArray, trapezoidArea: number, options: Options, x: number, y: number) {
  const areaThreshold = trapezoidArea * 0.8;
  const iterations = 10000;
  let bestTrapezoid: Trapezoid | undefined;
  let bestFit: number | undefined;
  for (let i = 0; i < iterations; i++) {
    const sample: Vertex[] = getSemiRandomSample(4, options.squareSize);
    // If sample not within 20% of area, continue
    const trapezoid = computeTrapezoid(sample);
    const area = calculateArea(trapezoid);
    if (area < areaThreshold || area > trapezoidArea * 1.2) continue;
    const trapezoidFit = fitTrapezoid(trapezoid, edgePixels, options, ctx, x, y);
    if (trapezoidFit && (!bestFit || trapezoidFit < bestFit)) {
      bestTrapezoid = trapezoid;
      bestFit = trapezoidFit;
    }
  }  
  if (ctx && bestTrapezoid) {
    ctx.beginPath();
    ctx.moveTo(bestTrapezoid.top.x1 + x, bestTrapezoid.top.y1 + y);
    ctx.lineTo(bestTrapezoid.top.x2 + x, bestTrapezoid.top.y2 + y);
    ctx.lineTo(bestTrapezoid.bottom.x2 + x, bestTrapezoid.bottom.y2 + y);
    ctx.lineTo(bestTrapezoid.bottom.x1 + x, bestTrapezoid.bottom.y1 + y);
    ctx.lineTo(bestTrapezoid.top.x1 + x, bestTrapezoid.top.y1 + y);
    ctx.strokeStyle = "red";
    ctx.stroke();
  }
  return bestTrapezoid;
}

function getSemiRandomSample<Vertex>(size: number, width: number): Vertex[] {
  const sample: Vertex[] = [];

  // make a list of 8 random numbers
  const randomNumbers: number[] = [];
  for (let i = 0; i < size; i++) {
    randomNumbers.push(Math.floor(Math.random() * (width / 2)));
    randomNumbers.push(Math.floor(Math.random() * (width / 2)));
  }

  sample.push({ x: randomNumbers[0], y: randomNumbers[1] } as Vertex)
  sample.push({ x: randomNumbers[2] + width/2, y: randomNumbers[3] } as Vertex)
  sample.push({ x: randomNumbers[4], y: randomNumbers[5] + width/2 } as Vertex)
  sample.push({ x: randomNumbers[6] + width/2, y: randomNumbers[7] + width/2 } as Vertex)
  
  return sample;
}

function fitTrapezoid(trapezoid: Trapezoid, edgeData: Uint8ClampedArray, options: Options, ctx: CanvasRenderingContext2D, x1: number, y1: number): number | null {
  // Implement least-squares fitting algorithm to on trapezoid and edge pixels
  // and return the r2 value
  let r = 0
  const width = options.squareSize;
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x);
      const pixel = edgeData[index];
      if (pixel === 0) continue;

    let distance = distanceFromTrapezoid({ x: y, y: x }, trapezoid, ctx, x1, y1);
    r += distance * distance
  }
}
  return r
}

function distanceFromTrapezoid(point: Vertex, trapezoid: Trapezoid, ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Calculate the distance from the point to the trapezoid
  // find distance to each side of trapezoid and return the min
  let minDistance = 1000000;
  let minIntercept = [0, 0];
  const sides = [trapezoid.top, trapezoid.bottom, trapezoid.left, trapezoid.right];
  for (let i = 0; i < 4; i++) {
    const minSide = sides[i];
    const slope = (minSide.y2 - minSide.y1) / (minSide.x2 - minSide.x1);
    if (slope < 0.001 && slope > -0.001) {
      let d = Math.min(Math.abs(point.y - minSide.y1), Math.abs(point.y - minSide.y2));
      if (d < minDistance) {
        minDistance = d;
        if(point.y < minSide.y1) {
          minIntercept = [minSide.x1, minSide.y1];
        }
        else {
          minIntercept = [minSide.x2, minSide.y2];
        }
      }
    }
    else if (slope > 1000 || slope < -1000) {
      let d = Math.min(Math.abs(point.x - minSide.x1), Math.abs(point.x - minSide.x2));
      if (d < minDistance) {
        minDistance = d;
        if(point.x < minSide.x1) {
          minIntercept = [minSide.x1, minSide.y1];
        }
        else {
          minIntercept = [minSide.x2, minSide.y2];
        }
      }
    }
    const normalSlope = -1 / slope;
    const normalIntercept = point.y - normalSlope * point.x;
    const intersection = getIntersection(minSide, { x1: 0, y1: normalIntercept, x2: 1, y2: normalSlope + normalIntercept });
    // if intersection is not on the line segment, return the distance to the closest endpoint
    if (intersection.x < Math.min(minSide.x1, minSide.x2) || intersection.x > Math.max(minSide.x1, minSide.x2) || intersection.y < Math.min(minSide.y1, minSide.y2) || intersection.y > Math.max(minSide.y1, minSide.y2)) {
      const dis1 = Math.sqrt(Math.pow(minSide.x1 - point.x, 2) + Math.pow(minSide.y1 - point.y, 2));
      const dis2 = Math.sqrt(Math.pow(minSide.x2 - point.x, 2) + Math.pow(minSide.y2 - point.y, 2));
      if (dis1 < minDistance) {
        minDistance = dis1;
        minIntercept = [minSide.x1, minSide.y1];
      }
      if (dis2 < minDistance) {
        minDistance = dis2;
        minIntercept = [minSide.x2, minSide.y2];
      }
      continue;
    }
    let dis = Math.sqrt(Math.pow(intersection.x - point.x, 2) + Math.pow(intersection.y - point.y, 2));
    if (dis < minDistance) {
      minDistance = dis;
      minIntercept = [intersection.x, intersection.y];
    }
  }
  return minDistance === 1000000 ? 0 : minDistance;
}

function getIntersection(line1: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">, line2: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">) {
  const slope1 = (line1.y2 - line1.y1) / (line1.x2 - line1.x1);
  const slope2 = (line2.y2 - line2.y1) / (line2.x2 - line2.x1);
  const intercept1 = line1.y1 - slope1 * line1.x1;
  const intercept2 = line2.y1 - slope2 * line2.x1;
  if (slope1 - slope2 < 0.001 && slope1 - slope2 > -0.001) {
    console.log("parallel")
    return { x: 0, y: 0 };
  }
  const x = (intercept2 - intercept1) / (slope1 - slope2);
  const y = slope1 * x + intercept1;
  return { x, y };
}

function DirectSearchOptimization(ft: (data: Uint8ClampedArray, trapezoid: Trapezoid, options: Options, x: number, y: number, ctx: CanvasRenderingContext2D) => number, trapezoid: Trapezoid, data: Uint8ClampedArray, options: Options, ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Move each vertex in trapezoid by 5 pixels in 16 directions, take the best one
  let vertices = [{ x: trapezoid.top.x1, y: trapezoid.top.y1 }, { x: trapezoid.top.x2, y: trapezoid.top.y2 }, { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 }, { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 } ];
  let bestFt: number = ft(data, trapezoid, options, x, y, ctx);
  let improvement = 0
  for (let k = 0; k < 12; k++) {
    for (let i = 0; i < vertices.length; i++) {
      let bestVertex: Vertex | undefined;
      const vertex = vertices[i];
      for (let j = 0; j < 16; j++) {
        const direction = j * Math.PI / 8;
        const dx = Math.cos(direction) * (((k % 3) + 1) * 2);
        const dy = Math.sin(direction) * (((k % 3) + 1) * 2);
        const newVertex: Vertex = { x: Math.round(vertex.x + dx), y: Math.round(vertex.y + dy) };
        if (newVertex.x < x - options.squareSize/2 || newVertex.x >= options.squareSize/2 + x || newVertex.y < y - options.squareSize/2 || newVertex.y >= options.squareSize/2 + y) {
          continue;
        }
        const newTrapezoid = computeTrapezoid(vertices.map((v, index) => index === i ? newVertex : { x: Math.round(v.x), y: Math.round(v.y) }));
        const newFt = ft(data, newTrapezoid, options, x, y, ctx);
        // console.log({newFt, newVertex})
        if (bestFt === undefined || newFt > bestFt) {
          improvement = bestFt === undefined ? 100 : newFt - bestFt;
          bestFt = newFt;
          bestVertex = newVertex;
        }
      }
      if (bestVertex) {
        // @ts-ignore
        vertices = vertices.map((v, index) => index === i ? bestVertex : { x: Math.round(v.x), y: Math.round(v.y) });
      }
    }
  }
  return computeTrapezoid(vertices.map(v => ({ x: Math.round(v.y - y + x), y: Math.round(v.x - x + y) })));
}

function getPointsOnTrapezoid(data: Uint8ClampedArray, trapezoid: Trapezoid, options: Options, xx: number, yy: number, ctx: CanvasRenderingContext2D): number {
  // Find the actual number of edge pixels in each line
  const lines = [trapezoid.top, trapezoid.bottom, trapezoid.left, trapezoid.right];
  let points = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const xStep = dx / length;
    const yStep = dy / length;
    let x = line.x1 - xx + options.squareSize / 2;
    let y = line.y1 - yy + options.squareSize / 2;
    // console.log({x, y})
    for (let j = 0; j < length; j++) {
      // if (data[Math.round(y) * options.squareSize + Math.round(x)] === 255) {
      if (data[Math.round(y) * options.squareSize + Math.round(x)] === 255 || data[Math.round(y) * options.squareSize + Math.round(x + 1)] === 255 || data[Math.round(y) * options.squareSize + Math.round(x - 1)] === 255 || data[Math.round(y + 1) * options.squareSize + Math.round(x)] === 255 || data[Math.round(y - 1) * options.squareSize + Math.round(x)] === 255) {
        points++;
        
      }
      x += xStep;
      y += yStep;
    }
  }
  return points
}

type Trapezoid = {
  top: Pick<LineSegment, 'x1' | 'x2' | 'y1' | 'y2'>;
  right: Pick<LineSegment, 'x1' | 'x2' | 'y1' | 'y2'>;
  left: Pick<LineSegment, 'x1' | 'x2' | 'y1' | 'y2'>;
  bottom: Pick<LineSegment, 'x1' | 'x2' | 'y1' | 'y2'>;
};

function computeTrapezoid(vertices: Vertex[], ctx?: CanvasRenderingContext2D): Trapezoid {
  const sums = vertices.map((vertex) => vertex.x + vertex.y);
  const topLeft = vertices[sums.indexOf(Math.min(...sums))];
  const bottomRight = vertices[sums.indexOf(Math.max(...sums))];
  const differences = vertices.map((vertex) => vertex.x - vertex.y);
  const topRight = vertices[differences.indexOf(Math.max(...differences))];
  const bottomLeft = vertices[differences.indexOf(Math.min(...differences))];

  if (ctx && vertices.length === 4) {
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.lineTo(topLeft.x, topLeft.y);
    ctx.strokeStyle = "red";
    ctx.stroke();
  }
  return {top: {x1: topLeft.x, y1: topLeft.y, x2: topRight.x, y2: topRight.y}, bottom: {x1: bottomLeft.x, y1: bottomLeft.y, x2: bottomRight.x, y2: bottomRight.y}, left: {x1: topLeft.x, y1: topLeft.y, x2: bottomLeft.x, y2: bottomLeft.y}, right: {x1: topRight.x, y1: topRight.y, x2: bottomRight.x, y2: bottomRight.y}};
}

function drawVertices(
  vertices: Vertex[],
  ctx: CanvasRenderingContext2D,
) {
  for (const vertex of vertices) {
    ctx.beginPath();
    ctx.arc(vertex.x, vertex.y, 5, 0, 2 * Math.PI);
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

function grayscale(
  imageData: ImageData,
  ctx?: CanvasRenderingContext2D
) {
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
    const gray =
      .2126 * r +
      .7152 * g +
      .0722 * b;
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
  return edgeData
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
  return edgeData
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
  return edgeData
}


interface IHoughLine {
  theta: number;
  r: number;
}

function hough(
  data: Uint8ClampedArray,
  options: Options,
  thetaStep = Math.PI / 180
): LineSegment[] {
  // Calculate the maximum possible distance in the image
  const width = options.squareSize;
  const height = options.squareSize;
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
  const threshold = maxVotes * options.houghVoteThreshold;
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
  return CartesionLines(lines, width, height, options);
}

function CartesionLines(
  lines: IHoughLine[],
  width: number,
  height: number,
  options: Options
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
  return Merge(cartesionLines, options);
}

function Merge(lines: LineSegment[], options: Options): LineSegment[] {
  // add weighted average of lines with similar theta
  const mergedLines: (LineSegment & {count: number})[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let merged = false;
    for (let j = 0; j < mergedLines.length; j++) {
      const mergedLine = mergedLines[j];
      if (Math.sqrt((line.x1 - mergedLine.x1) ** 2 + (line.y1 - mergedLine.y1)**2) < options.mergeThetaThreshold && Math.sqrt((line.x2 - mergedLine.x2) ** 2 + (line.y2 - mergedLine.y2)**2) < options.mergeThetaThreshold) {
        const count = mergedLine.count || 1;
        mergedLine.x1 = Math.round((line.x1 + mergedLine.x1 * count) / (1 + count));
        mergedLine.y1 = Math.round((line.y1 + mergedLine.y1 * count) / (1 + count));
        mergedLine.x2 = Math.round((line.x2 + mergedLine.x2 * count) / (1 + count));
        mergedLine.y2 = Math.round((line.y2 + mergedLine.y2 * count) / (1 + count));
        merged = true;
        break;
      }
    }
    if (!merged) {
      mergedLines.push({...line, count: 1});
    }
  }
  return mergedLines;
}

function pixelsPerLine(
  lines: LineSegment[],
  data: Uint8ClampedArray,
  options: Options
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
    let firstPixel: number[] = []
    let lastPixel: number[] = [];
    let pixels = 0;
    for (let j = 0; j < length; j++) {
      if (data[Math.round(y) * options.squareSize + Math.round(x)] === 255 || data[Math.round(y) * options.squareSize + Math.round(x + 1)] === 255 || data[Math.round(y) * options.squareSize + Math.round(x - 1)] === 255 || data[Math.round(y + 1) * options.squareSize + Math.round(x)] === 255 || data[Math.round(y - 1) * options.squareSize + Math.round(x)] === 255) {
        if (firstPixel.length === 0) {
          firstPixel = [x, y];
        }
        lastPixel = [x, y];
        pixels++;
      }
      x += xStep;
      y += yStep;
    }
    goodLines.push({...line, pixels, x1: firstPixel[0], y1: firstPixel[1], x2: lastPixel[0], y2: lastPixel[1], length: Math.sqrt((lastPixel[0] - firstPixel[0]) ** 2 + (lastPixel[1] - firstPixel[1]) ** 2)});
  }
  const maxPixels = Math.max(...goodLines.map(line => line.pixels));
  return goodLines.filter(line => line.pixels > maxPixels * options.pixelThreshold && line.length > options.squareSize * 0.25).sort((a,b) => a.pixels - b.pixels).slice(0, options.maxLines);
  // return goodLines.filter(line => line.pixels > maxPixels * options.pixelThreshold).sort((a,b) => a.pixels - b.pixels).slice(0, options.maxLines);
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
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    vertices.push({ x: line.x1, y: line.y1 });
    vertices.push({ x: line.x2, y: line.y2 });
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
  return vertices.map(vertex => ({ x: Math.round(vertex.x), y: Math.round(vertex.y) }));
}

interface Point {
  x: number;
  y: number;
}

function intersectionPoint(
  line1: LineSegment | Pick<LineSegment, 'x1' | 'x2' | 'y1' | 'y2'>,
  line2: LineSegment | Pick<LineSegment, 'x1' | 'x2' | 'y1' | 'y2'>,
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
