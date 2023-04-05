import { createEffect, createSignal, onMount, untrack } from "solid-js";
import { Button } from "./Button";
import DetectTrapezoids from "./DetectTrapezoids";
import EdgeFilter from "./EdgeFilter";

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
  gaussianKernel: [0.06242931069425457, 0.1247976249479739, 0.2524974040020353],
  hysteresisHigh: 0.075,
  hysteresisLow: 0.0275,
  minNeighborsForNoiseReduction: 6,
  houghVoteThreshold: 0.65,
  mergeThetaThreshold: 10,
  pixelThreshold: 0.35,
  maxLines: 6,
  noiseReductionIterations: 15,
  densityThreshold: 0.3080404237765713,
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
  const [densityThreshold, setDensityThreshold] = createSignal(
    defaultOptions.densityThreshold
  );
  const [densityStep, setDensityStep] = createSignal(
    defaultOptions.densityStep
  );
  const [densitySize, setDensitySize] = createSignal(
    defaultOptions.densitySize
  );
  const [trapezoids, setTrapezoids] = createSignal<Trapezoid[]>([]);
  const [edgeData, setEdgeData] = createSignal<ImageData>();

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
    const imageData = ctx.getImageData(0, 0, canvasRef.width, canvasRef.height);
    const rect = canvasRef.getBoundingClientRect();
    const rectWidth = rect.right - rect.left;
    const rectHeight = rect.bottom - rect.top;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imgX = Math.round((x / rectWidth) * canvasRef.width);
    const imgY = Math.round((y / rectHeight) * canvasRef.height);
    setPoints([...points(), [imgX, imgY]]);
    let { trapezoid, fit } = DetectTrapezoids(imgX, imgY, ctx, options());
    // if trapezoid is bad or not found, try finding it with the RANSAC algorithm
    const valid = trapezoid && trapezoidIsValid(trapezoid, ctx, imgX, imgY, options(), fit);
    if (!valid) {
      const square = getSquare(imageData, imgX, imgY, options().squareSize);
      trapezoid = RANSAC(ctx, square, 0, options(), imgX - options().squareSize/2, imgY - options().squareSize/2)!;
      if(!trapezoid) return;
      console.log("RANSAC trapezoid", trapezoid);
      trapezoid = convertLocalToGlobal(trapezoid, imgX - options().squareSize / 2, imgY - options().squareSize / 2);
      // DrawTrapezoid(trapezoid, ctx, "blue");
      const { trapezoid: newTrapezoid, fit } = DirectSearchOptimization(
        getPointsOnTrapezoid,
        trapezoid,
        square,
        options(),
        ctx,
        imgX - options().squareSize / 2,
        imgY - options().squareSize / 2
      );
      trapezoid = newTrapezoid;
      DrawTrapezoid(trapezoid, ctx, "yellow");
      console.log({fit})
    }
    const connectedTrapezoids = findConnectedTrapezoids(
      trapezoid,
      ctx,
      imgX,
      imgY,
      options(),
      fit
    );
    setTrapezoids((prev) => [...prev, ...connectedTrapezoids, trapezoid]);
    console.log("connectedTrapezoids", connectedTrapezoids);
  };

  function trapezoidIsValid(trapezoid: Trapezoid, ctx: CanvasRenderingContext2D, x: number, y: number, options: Options, fit: number) {
    const { squareSize } = options;
    const area = calculateArea(trapezoid);
    const areaThreshold = squareSize ** 2 * 0.2;
    const areaValid = area > areaThreshold;
    const fitValid = Math.abs(fit) > 25;
    // make sure each side is at least 1/3 of the square size
    const sideThresh = squareSize / 10;
    const top = Math.sqrt((trapezoid.top.x1 - trapezoid.top.x2) ** 2 + (trapezoid.top.y1 - trapezoid.top.y2) ** 2);
    const bottom = Math.sqrt((trapezoid.bottom.x1 - trapezoid.bottom.x2) ** 2 + (trapezoid.bottom.y1 - trapezoid.bottom.y2) ** 2);
    const left = Math.sqrt((trapezoid.left.x1 - trapezoid.left.x2) ** 2 + (trapezoid.left.y1 - trapezoid.left.y2) ** 2);
    const right = Math.sqrt((trapezoid.right.x1 - trapezoid.right.x2) ** 2 + (trapezoid.right.y1 - trapezoid.right.y2) ** 2);
    const sideValid = top > sideThresh && bottom > sideThresh && left > sideThresh && right > sideThresh;
    const valid = areaValid && fitValid && sideValid;
    console.log({ area, areaValid, fitValid, sideValid, valid })
    return valid;
  }

  createEffect(async () => {
    console.log("refreshing");
    refresh();
    const o = options();
    await setupCanvas(canvasRef, o);
    untrack(() => {
      const ctx = canvasRef.getContext("2d")!;
      for (const [x, y] of points()) DetectTrapezoids(x, y, ctx, o);
    });
  });

  onMount(() => {
    canvasRef.addEventListener("mousedown", handleMouseDown);
  });

  function handleMouseDown(e: MouseEvent) {
    // get the mouse cursor position at startup:
    const rect = canvasRef.getBoundingClientRect();
    const rectWidth = rect.right - rect.left;
    const rectHeight = rect.bottom - rect.top;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imgX = Math.round((x / rectWidth) * canvasRef.width);
    const imgY = Math.round((y / rectHeight) * canvasRef.height);
    if (!edgeData()) {
      const ctx = canvasRef.getContext("2d")!;
      const imageData = ctx.getImageData(0, 0, canvasRef.width, canvasRef.height);
      setEdgeData(imageData);
    }
    // find if the nearest vertex is close enough
    const { nearestDistance } = findNearestVertex(imgX, imgY, trapezoids());
    console.log({ nearestDistance, imgX, imgY })
    if (nearestDistance < 25) {
      // start dragging
      canvasRef.addEventListener("mousemove", handleMouseMove);
      canvasRef.addEventListener("mouseup", handleMouseUp);
      // prevent the selection of the canvas:
      e.preventDefault();

    } else {
      handleClick(e);
    }
  }

  function handleMouseMove(e: MouseEvent) {
    // calculate the new cursor position:
    const rect = canvasRef.getBoundingClientRect();
    const rectWidth = rect.right - rect.left;
    const rectHeight = rect.bottom - rect.top;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imgX = Math.round((x / rectWidth) * canvasRef.width);
    const imgY = Math.round((y / rectHeight) * canvasRef.height);
    // find if the nearest vertex is close enough
    const { nearestVertex, nearestDistance } = findNearestVertex(imgX, imgY, trapezoids());
    if (nearestDistance < 3) return;
    if (nearestVertex) {
      const ctx = canvasRef.getContext("2d")!;
      console.log({ nearestVertex, imgX, imgY })
      const trapezoid = trapezoids().find(t => t.top.x1 === nearestVertex.x && t.top.y1 === nearestVertex.y || t.top.x2 === nearestVertex.x && t.top.y2 === nearestVertex.y || t.bottom.x1 === nearestVertex.x && t.bottom.y1 === nearestVertex.y || t.bottom.x2 === nearestVertex.x && t.bottom.y2 === nearestVertex.y);
      if(!trapezoid) return;
      const newTrapezoid = moveVertex(trapezoid, nearestVertex, imgX, imgY);
      const newTrapezoids = trapezoids().map(t => t.top.x1 === nearestVertex.x && t.top.y1 === nearestVertex.y || t.top.x2 === nearestVertex.x && t.top.y2 === nearestVertex.y || t.bottom.x1 === nearestVertex.x && t.bottom.y1 === nearestVertex.y || t.bottom.x2 === nearestVertex.x && t.bottom.y2 === nearestVertex.y ? newTrapezoid : t);
      setTrapezoids(newTrapezoids);
      ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
      ctx.putImageData(edgeData()!, 0, 0);
      for (const trapezoid of newTrapezoids) {
        DrawTrapezoid(trapezoid, ctx);
      }
    }
    refresh();
  }

  function moveVertex(trapezoid: Trapezoid, vertex: Vertex, x: number, y:number) {
    const newTrapezoid = { ...trapezoid };
    if (newTrapezoid.top.x1 === vertex.x && newTrapezoid.top.y1 === vertex.y) {
      newTrapezoid.top.x1 = x;
      newTrapezoid.top.y1 = y;
    } else if (newTrapezoid.top.x2 === vertex.x && newTrapezoid.top.y2 === vertex.y) {
      newTrapezoid.top.x2 = x;
      newTrapezoid.top.y2 = y;
    } else if (newTrapezoid.bottom.x1 === vertex.x && newTrapezoid.bottom.y1 === vertex.y) {
      newTrapezoid.bottom.x1 = x;
      newTrapezoid.bottom.y1 = y;
    } else if (newTrapezoid.bottom.x2 === vertex.x && newTrapezoid.bottom.y2 === vertex.y) {
      newTrapezoid.bottom.x2 = x;
      newTrapezoid.bottom.y2 = y;
    }
    return newTrapezoid;
  }

  function handleMouseUp() {
    canvasRef.removeEventListener("mousemove", handleMouseMove);
    canvasRef.removeEventListener("mouseup", handleMouseUp);
  }

  function findNearestVertex(x: number, y: number, trapezoids: Trapezoid[]) {
    let nearestVertex: Vertex | undefined;
    let nearestDistance = Infinity;
    for (const trapezoid of trapezoids) {
      const vertices = [{ x: trapezoid.top.x1, y: trapezoid.top.y1 }, { x: trapezoid.top.x2, y: trapezoid.top.y2 }, { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 }, { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 }]
      for (const vertex of vertices) {
        const distance = Math.sqrt(
          Math.pow(vertex.x - x, 2) + Math.pow(vertex.y - y, 2)
        );
        if (distance < nearestDistance) {
          nearestVertex = vertex;
          nearestDistance = distance;
        }
      }
    }
    return {nearestDistance, nearestVertex}
  }

  const updateParams = () => {
    let [gauss0, gauss1, gauss2] = gaussianKernel();
    gauss0 += ((Math.random() - 0.5) / 100) * gauss0;
    gauss1 += ((Math.random() - 0.5) / 100) * gauss1;
    gauss2 += ((Math.random() - 0.5) / 100) * gauss2;
    setGaussianKernel([gauss0, gauss1, gauss2]);
    setDensityThreshold(densityThreshold() + (Math.random() - 0.5) / 100);
  };

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
          setTrapezoids([]);
          setRefresh(refresh() + 1);
        }}
      >
        Clear Squares
      </Button>
      <Button onClick={updateParams}>Randomize Parameters</Button>
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
      EdgeFilter(canvas, options, imageData, ctx)
      res();
    };
    img.src = "/img/grab_6.jpeg";
  });
};

function convertLocalToGlobal(
  trapezoid: Trapezoid,
  x: number,
  y: number
): Trapezoid {
  return {
    top: {
      x1: trapezoid.top.x1 + x,
      y1: trapezoid.top.y1 + y,
      x2: trapezoid.top.x2 + x,
      y2: trapezoid.top.y2 + y,
    },
    bottom: {
      x1: trapezoid.bottom.x1 + x,
      y1: trapezoid.bottom.y1 + y,
      x2: trapezoid.bottom.x2 + x,
      y2: trapezoid.bottom.y2 + y,
    },
    left: {
      x1: trapezoid.left.x1 + x,
      y1: trapezoid.left.y1 + y,
      x2: trapezoid.left.x2 + x,
      y2: trapezoid.left.y2 + y,
    },
    right: {
      x1: trapezoid.right.x1 + x,
      y1: trapezoid.right.y1 + y,
      x2: trapezoid.right.x2 + x,
      y2: trapezoid.right.y2 + y,
    },
  } as Trapezoid;
}

function DrawTrapezoid(
  trapezoid: Trapezoid,
  ctx: CanvasRenderingContext2D,
  color: string = "green"
) {
  ctx.beginPath();
  ctx.moveTo(trapezoid.top.x1, trapezoid.top.y1);
  ctx.lineTo(trapezoid.top.x2, trapezoid.top.y2);
  ctx.lineTo(trapezoid.bottom.x2, trapezoid.bottom.y2);
  ctx.lineTo(trapezoid.bottom.x1, trapezoid.bottom.y1);
  ctx.lineTo(trapezoid.top.x1, trapezoid.top.y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function calculateArea(trapezoid: Trapezoid): number {
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
  const area1 = Math.sqrt((s - a) * (s - b) * (s - c) * (s - d));

  const a2 = Math.sqrt(
    (trapezoid.top.x1 - trapezoid.top.x2) ** 2 +
      (trapezoid.top.y1 - trapezoid.top.y2) ** 2
  );
  const b2 = Math.sqrt(
    (trapezoid.bottom.x1 - trapezoid.bottom.x2) ** 2 +
      (trapezoid.bottom.y1 - trapezoid.bottom.y2) ** 2
  );
  const c2 = Math.sqrt(
    (trapezoid.left.x1 - trapezoid.left.x2) ** 2 +
      (trapezoid.left.y1 - trapezoid.left.y2) ** 2
  );
  const d2 = Math.sqrt(
    (trapezoid.right.x1 - trapezoid.right.x2) ** 2 +
      (trapezoid.right.y1 - trapezoid.right.y2) ** 2
  );
  // Calculate the semiperimeter of the quadrilateral
  const s2 = (a2 + b2 + c2 + d2) / 2;

  // Calculate the area using Brahmagupta's formula
  const area2 = Math.sqrt((s2 - a2) * (s2 - b2) * (s2 - c2) * (s2 - d2));

  return Math.max(area1, area2);
}

function findConnectedTrapezoids(
  trapezoid: Trapezoid,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: Options,
  fit: number,
) {
  const squareSize = options.squareSize + 10
  // check for trapezoids recursively in the 4 directions
  let trapezoids: Trapezoid[] = [];
  // const xShift = trapezoid.top.y1 - trapezoid.top.y2
  const yShift = Math.round((trapezoid.top.y1 + trapezoid.top.y2)/2 - (trapezoid.bottom.y1 + trapezoid.bottom.y2)/2) - 5
  const xShift = Math.round(trapezoid.top.y1 - trapezoid.top.y2)
    recurseSearchTrapezoid(
    x,
    y,
    -xShift,
    yShift,
    trapezoid,
    ctx,
    options,
    trapezoids,
      0,
      squareSize,
    fit
  )?.forEach((t) => trapezoids.push(t));
  recurseSearchTrapezoid(
    x,
    y,
    xShift,
    -yShift,
    trapezoid,
    ctx,
    options,
    trapezoids,
    0,
    squareSize,
    fit
  )?.forEach((t) => trapezoids.push(t));
  return trapezoids;
}

function recurseSearchTrapezoid(
  x: number,
  y: number,
  deltaX: number,
  deltaY: number,
  trapezoid: any,
  ctx: CanvasRenderingContext2D,
  options: Options,
  trapezoids: Trapezoid[],
  count: number,
  squareSize: number,
  fit: number
): Trapezoid[] {
  if (!trapezoid || count > 16) return trapezoids;
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const square = getSquare(
    imageData,
    x + deltaX,
    y + deltaY,
    squareSize
  );
  // ctx.beginPath();
  // ctx.rect(x + deltaX - squareSize/2, y + deltaY - squareSize/2, squareSize, squareSize);
  // ctx.strokeStyle = 'red';
  // ctx.stroke();
  // ctx.closePath();
  // const nextTrapezoid = RANSAC(ctx, square, calculateArea(trapezoid), options, x + deltaX - squareSize / 2, y + deltaY - (squareSize / 2), squareSize);
  // if (nextTrapezoid) {
    // }
    // let newTest: Trapezoid | undefined;
    // if (nextTrapezoid) newTest = DirectSearchOptimization(getPointsOnTrapezoid, convertLocalToGlobal(nextTrapezoid, x + deltaX - squareSize/2, y + deltaY - squareSize/2), square, options, ctx, x + deltaX, y + deltaY, squareSize);
    const shiftedTrapezoid = {
      top: {
        x1: trapezoid.top.x1 + deltaX,
        y1: trapezoid.top.y1 + deltaY,
        x2: trapezoid.top.x2 + deltaX,
        y2: trapezoid.top.y2 + deltaY,
      },
    bottom: {
      x1: trapezoid.bottom.x1 + deltaX,
      y1: trapezoid.bottom.y1 + deltaY,
      x2: trapezoid.bottom.x2 + deltaX,
      y2: trapezoid.bottom.y2 + deltaY,
    },
    left: {
      x1: trapezoid.left.x1 + deltaX,
      y1: trapezoid.left.y1 + deltaY,
      x2: trapezoid.left.x2 + deltaX,
      y2: trapezoid.left.y2 + deltaY,
    },
    right: {
      x1: trapezoid.right.x1 + deltaX,
      y1: trapezoid.right.y1 + deltaY,
      x2: trapezoid.right.x2 + deltaX,
      y2: trapezoid.right.y2 + deltaY,
    },
  };
  // DrawTrapezoid(shiftedTrapezoid, ctx, 'purple');
  // console.log("trapezoid", trapezoid);
  // console.log("shiftedTrapezoid", shiftedTrapezoid);
  const firstTest = FixedDirectSearchOptimization(
    getPointsOnTrapezoid,
    shiftedTrapezoid,
    square,
    options,
    ctx,
    x + deltaX - squareSize / 2,
    y + deltaY - squareSize / 2,
    squareSize,
    fit
  );
  if (!firstTest) { return trapezoids;}
  // DrawTrapezoid(firstTest, ctx, 'yellow');
  const secondTest = RecurseDirectSearchOptimization(
    getPointsOnTrapezoid,
    firstTest,
    square,
    options,
    ctx,
    x + deltaX - squareSize / 2,
    y + deltaY - squareSize / 2,
    squareSize
  );
  if (secondTest) {
    DrawTrapezoid(secondTest, ctx);
    trapezoids.push(secondTest);
    // const xShift = deltaX < 0 ? trapezoid.top.y1 - trapezoid.top.y2 : -trapezoid.top.y1 + trapezoid.top.y2
    let xShift = Math.round((((trapezoid.top.x1 + trapezoid.top.x2)/2 + (trapezoid.bottom.x1 + trapezoid.bottom.x2)/2))/2 - ((secondTest.top.x1 + secondTest.top.x2)/2 + (secondTest.bottom.x1 + secondTest.bottom.x2)/2)/2)
    let temp =
      Math.round(
        (secondTest.top.y1 + secondTest.top.y2) / 2 -
          (secondTest.bottom.y1 + secondTest.bottom.y2) / 2
      );
    // const left = x + deltaX - squareSize / 2;
    // const right = x + deltaX + squareSize / 2;
    // if (secondTest.left.x1 < left && secondTest.left.x2 < left) {
    //   xShift -= 5;
    // }
    // if (secondTest.right.x1 > right && secondTest.right.x2 > right) {
    //   xShift += 5;
    // }
    // const top = y + deltaY - squareSize / 2;
    // const bottom = y + deltaY + squareSize / 2;
    // if (secondTest.top.y1 < top && secondTest.top.y2 < top) {
    //   temp += 5;
    // }
    // if (secondTest.bottom.y1 > bottom && secondTest.bottom.y2 > bottom) {
    //   temp -= 5;
    // }
    const yShift = deltaY < 0 ? temp : -temp;

    return recurseSearchTrapezoid(
      x + deltaX,
      y + deltaY,
      -xShift,
      yShift,
      secondTest,
      ctx,
      options,
      trapezoids,
      count + 1,
      squareSize,
      fit
    );
  }
  return trapezoids;
}

function getPointsOnTrapezoid(
  data: Uint8ClampedArray,
  trapezoid: Trapezoid,
  options: Options,
  xx: number,
  yy: number,
  ctx: CanvasRenderingContext2D,
  squareSize?: number
): number {
  // Find the actual number of edge pixels in each line
  // drawSquare(data, ctx, squareSize ?? options.squareSize)
  const lines = [
    trapezoid.top,
    trapezoid.bottom,
    trapezoid.left,
    trapezoid.right,
  ];
  let points = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const xStep = dx / length;
    const yStep = dy / length;
    let x = line.x1 - xx;
    let y = line.y1 - yy;
    // ctx.beginPath();
    // ctx.moveTo(line.x1, line.y1);
    // ctx.lineTo(line.x1 + xStep * length, line.y1 + yStep * length);
    // ctx.strokeStyle = 'green';
    // ctx.stroke();
    // ctx.closePath();
    for (let j = 0; j < length; j++) {
      if (
        data[
          Math.round(y + (yStep * j)) * (squareSize ?? options.squareSize) + Math.round(x + (xStep*j))
        ] === 255 ||
        data[
          Math.round(y + (yStep * j)) * (squareSize ?? options.squareSize) + Math.round(x + (xStep*j) + 1)
        ] === 255 ||
        data[
          Math.round(y + (yStep * j)) * (squareSize ?? options.squareSize) + Math.round(x + (xStep*j) - 1)
        ] === 255 ||
        data[
          Math.round(y + (yStep * j) + 1) * (squareSize ?? options.squareSize) + Math.round(x + (xStep*j))
        ] === 255 ||
        data[
          Math.round(y + (yStep * j) - 1) * (squareSize ?? options.squareSize) + Math.round(x + (xStep*j))
        ] === 255
        ) {
        //   ctx.beginPath();
        //   ctx.rect(Math.round(x + xStep*j) + xx, Math.round(y + yStep*j) + yy, 1, 1);
        //   ctx.strokeStyle = "green";
        //   ctx.stroke();
          points++;
      }
    }
  }
  return points;
}

function drawSquare(square: Uint8ClampedArray, ctx: CanvasRenderingContext2D, width: number) {
  for (let i = 0; i < square.length; i++) {
    if (square[i] === 255) {
      ctx.beginPath();
      ctx.rect(i % width, Math.floor(i / width), 1, 1);
      ctx.strokeStyle = "red";
      ctx.stroke();
    }
  }
}

function RANSAC(
  ctx: CanvasRenderingContext2D,
  edgePixels: Uint8ClampedArray,
  trapezoidArea: number,
  options: Options,
  x: number,
  y: number,
  squareSize?: number
): Trapezoid | undefined {
  const areaThreshold = [trapezoidArea * 0.9, trapezoidArea * 1.1];
  const iterations = 10000;
  let bestTrapezoid: Trapezoid | undefined;
  let bestFit: number | undefined;
  for (let i = 0; i < iterations; i++) {
    const sample: Vertex[] = getSemiRandomSample(
      4,
      squareSize ?? options.squareSize,
    );
    // If sample not within 20% of area, continue
    const trapezoid = computeTrapezoid(sample);
    const area = calculateArea(trapezoid);
    if ((trapezoidArea !== 0 && (area < areaThreshold[0] || area > areaThreshold[1])) || (trapezoidArea == 0 && (area < 45 * 45 || area > 60 * 55))) continue;
    // const trapezoidFit = fitTrapezoid(
    //   trapezoid,
    //   edgePixels,
    //   options,
    //   ctx,
    //   x,
    //   y,
    //   squareSize
    //   );
    const points = getPointsOnTrapezoid(edgePixels, convertLocalToGlobal(trapezoid, x,y), options, x, y, ctx, squareSize);
    // if (trapezoidFit && (!bestFit || trapezoidFit < bestFit)) {
    //   // console.log({trapezoid})
    //   bestTrapezoid = trapezoid;
    //   bestFit = trapezoidFit;
    //   // DrawTrapezoid(convertLocalToGlobal(trapezoid, x, y), ctx, 'green');
    // }
    console.log({points})
    if (points && (!bestFit || points > bestFit)) {
      bestTrapezoid = trapezoid;
      bestFit = points;
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

  sample.push({ x: randomNumbers[0], y: randomNumbers[1] } as Vertex);
  sample.push({
    x: randomNumbers[2] + width / 2,
    y: randomNumbers[3],
  } as Vertex);
  sample.push({
    x: randomNumbers[4],
    y: randomNumbers[5] + width / 2,
  } as Vertex);
  sample.push({
    x: randomNumbers[6] + width / 2,
    y: randomNumbers[7] + width / 2,
  } as Vertex);

  return sample;
}

function fitTrapezoid(
  trapezoid: Trapezoid,
  edgeData: Uint8ClampedArray,
  options: Options,
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  squareSize?: number
): number | null {
  // Implement least-squares fitting algorithm to on trapezoid and edge pixels
  // and return the r2 value
  let r = 0;
  const width = squareSize ?? options.squareSize;
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const pixel = edgeData[index];
      if (pixel === 0) continue;

      let distance = distanceFromTrapezoid(
        { x, y },
        trapezoid,
        ctx,
        x1,
        y1
      );
      if (distance < 2) {
        // draw pixel
        ctx.beginPath();
        ctx.rect(x + x1, y + y1, 1, 1);
        ctx.rect(x, y, 1, 1);
        ctx.strokeStyle = "green";
        ctx.stroke();
        ctx.closePath();
      }
      r += distance * distance;
    }
  }
  return r;
}

function distanceFromTrapezoid(
  point: Vertex,
  trapezoid: Trapezoid,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  // Calculate the distance from the point to the trapezoid
  // find distance to each side of trapezoid and return the min
  let minDistance = 1000000;
  let minIntercept = [0, 0];
  const sides = [
    trapezoid.top,
    trapezoid.bottom,
    trapezoid.left,
    trapezoid.right,
  ];
  for (let i = 0; i < 4; i++) {
    const minSide = sides[i];
    const slope = (minSide.y2 - minSide.y1) / (minSide.x2 - minSide.x1);
    if (slope < 0.001 && slope > -0.001) {
      let d = Math.min(
        Math.abs(point.y - minSide.y1),
        Math.abs(point.y - minSide.y2)
      );
      if (d < minDistance) {
        minDistance = d;
        if (point.y < minSide.y1) {
          minIntercept = [minSide.x1, minSide.y1];
        } else {
          minIntercept = [minSide.x2, minSide.y2];
        }
      }
    } else if (slope > 1000 || slope < -1000) {
      let d = Math.min(
        Math.abs(point.x - minSide.x1),
        Math.abs(point.x - minSide.x2)
      );
      if (d < minDistance) {
        minDistance = d;
        if (point.x < minSide.x1) {
          minIntercept = [minSide.x1, minSide.y1];
        } else {
          minIntercept = [minSide.x2, minSide.y2];
        }
      }
    }
    const normalSlope = -1 / slope;
    const normalIntercept = point.y - normalSlope * point.x;
    const intersection = getIntersection(minSide, {
      x1: 0,
      y1: normalIntercept,
      x2: 1,
      y2: normalSlope + normalIntercept,
    });
    // if intersection is not on the line segment, return the distance to the closest endpoint
    if (
      intersection.x < Math.min(minSide.x1, minSide.x2) ||
      intersection.x > Math.max(minSide.x1, minSide.x2) ||
      intersection.y < Math.min(minSide.y1, minSide.y2) ||
      intersection.y > Math.max(minSide.y1, minSide.y2)
    ) {
      const dis1 = Math.sqrt(
        Math.pow(minSide.x1 - point.x, 2) + Math.pow(minSide.y1 - point.y, 2)
      );
      const dis2 = Math.sqrt(
        Math.pow(minSide.x2 - point.x, 2) + Math.pow(minSide.y2 - point.y, 2)
      );
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
    let dis = Math.sqrt(
      Math.pow(intersection.x - point.x, 2) +
        Math.pow(intersection.y - point.y, 2)
    );
    if (dis < minDistance) {
      minDistance = dis;
      minIntercept = [intersection.x, intersection.y];
    }
  }
  return minDistance === 1000000 ? 0 : minDistance;
}

function getIntersection(
  line1: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">,
  line2: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">
) {
  const slope1 = (line1.y2 - line1.y1) / (line1.x2 - line1.x1);
  const slope2 = (line2.y2 - line2.y1) / (line2.x2 - line2.x1);
  const intercept1 = line1.y1 - slope1 * line1.x1;
  const intercept2 = line2.y1 - slope2 * line2.x1;
  if (slope1 - slope2 < 0.001 && slope1 - slope2 > -0.001) {
    console.log("parallel");
    return { x: 0, y: 0 };
  }
  const x = (intercept2 - intercept1) / (slope1 - slope2);
  const y = slope1 * x + intercept1;
  return { x, y };
}

function DirectSearchOptimization(
  ft: (
    data: Uint8ClampedArray,
    trapezoid: Trapezoid,
    options: Options,
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D,
    squareSize?: number
  ) => number,
  trapezoid: Trapezoid,
  data: Uint8ClampedArray,
  options: Options,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  squareSize?: number
) {
  // Move each vertex in trapezoid by 5 pixels in 16 directions, take the best one
  let vertices: Vertex[] = [
    { x: trapezoid.top.x1, y: trapezoid.top.y1 },
    { x: trapezoid.top.x2, y: trapezoid.top.y2 },
    { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 },
    { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 },
  ];
  let bestFt: number = ft(data, trapezoid, options, x, y, ctx, squareSize);
  console.log("bestFt init", bestFt, trapezoid);
  for (let k = 0; k < 27; k++) {
    for (let i = 0; i < vertices.length; i++) {
      let bestVertex: Vertex | undefined;
      const vertex = vertices[i];
      for (let j = 0; j < 16; j++) {
        const direction = (j * Math.PI) / 8;
        const dx = Math.cos(direction) * (((k % 6) + 1) * 2);
        const dy = Math.sin(direction) * (((k % 6) + 1) * 2);
        const newVertex: Vertex = {
          x: Math.round(vertex.x + dx),
          y: Math.round(vertex.y + dy),
        };
        if (
          newVertex.x < x ||
          newVertex.x >= (squareSize ?? options.squareSize) + x ||
          newVertex.y < y ||
          newVertex.y >= (squareSize ?? options.squareSize) + y
        ) {
          continue;
        }
        const newTrapezoid = computeTrapezoid(
          vertices.map((v, index) =>
            index === i ? newVertex : { x: Math.round(v.x), y: Math.round(v.y) }
          )
        );

        const newFt = ft(data, newTrapezoid, options, x, y, ctx, squareSize);
        if (bestFt === undefined || newFt > bestFt) {
          bestFt = newFt;
          // console.log({newFt})
          // vertices = vertices.map((v, index) =>
          // index === i ? newVertex : { x: Math.round(v.x), y: Math.round(v.y) }
          // );
          bestVertex = newVertex;
        }
      }
      if (bestVertex) {
        vertices = vertices.map((v, index) =>
          index === i ? bestVertex as Vertex : { x: Math.round(v.x), y: Math.round(v.y) }
        );
        console.log("bestFt", bestFt, vertices)
      }
    }
  }
  return { trapezoid: computeTrapezoid(vertices), fit: bestFt };
}

function FixedDirectSearchOptimization(
  ft: (
    data: Uint8ClampedArray,
    trapezoid: Trapezoid,
    options: Options,
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D,
    squareSize?: number
  ) => number,
  trapezoid: Trapezoid,
  data: Uint8ClampedArray,
  options: Options,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  squareSize: number,
  fit: number
) {
  let vertices = [
    { x: trapezoid.top.x1, y: trapezoid.top.y1 },
    { x: trapezoid.top.x2, y: trapezoid.top.y2 },
    { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 },
    { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 },
  ];
  let bestFt: number = ft(data, trapezoid, options, x, y, ctx, squareSize);
  for (let k = 0; k < 14; k++) {
    let bestVertices: Vertex[] | undefined;
    for (let j = 0; j < 16; j++) {
      const direction = (j * Math.PI) / 8;
      const dx = Math.cos(direction) * (((k % 8) + 1) * 1);
      const dy = Math.sin(direction) * (((k % 8) + 1) * 1);
      const shiftedVertices: Vertex[] = vertices.map((v) => ({
        x: v.x + dx,
        y: v.y + dy,
      }));
      const shiftedT: Trapezoid = computeTrapezoid(shiftedVertices);
      // DrawTrapezoid(shiftedT, ctx);
      const newFt = ft(data, shiftedT, options, x, y, ctx, squareSize);
      // console.log({newFt, newVertex})
      if (bestFt === undefined || newFt > bestFt) {
        bestFt = newFt;
        bestVertices = shiftedVertices;
      }
    }
    if (bestVertices) {
      // @ts-ignore
      vertices = bestVertices;
    }
  }
  if(bestFt < fit/4) return null
  return computeTrapezoid(vertices);
}

function RecurseDirectSearchOptimization(
  ft: (
    data: Uint8ClampedArray,
    trapezoid: Trapezoid,
    options: Options,
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D,
    squareSize?: number
  ) => number,
  trapezoid: Trapezoid,
  data: Uint8ClampedArray,
  options: Options,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  squareSize: number
) {
  // Move each vertex in trapezoid by 5 pixels in 16 directions, take the best one
  let vertices = [
    { x: trapezoid.top.x1, y: trapezoid.top.y1 },
    { x: trapezoid.top.x2, y: trapezoid.top.y2 },
    { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 },
    { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 },
  ];
  let bestFt: number = ft(data, trapezoid, options, x, y, ctx, squareSize);
  for (let k = 0; k < 16; k++) {
    for (let i = 0; i < vertices.length; i++) {
      let bestVertex: Vertex | undefined;
      const vertex = vertices[i];
      for (let j = 0; j < 16; j++) {
        const direction = (j * Math.PI) / 8;
        const dx = Math.cos(direction) * (((k % 3) + 1) * 1);
        const dy = Math.sin(direction) * (((k % 3) + 1) * 1);
        const newVertex: Vertex = {
          x: Math.round(vertex.x + dx),
          y: Math.round(vertex.y + dy),
        };
        if (
          newVertex.x < x - (squareSize ?? options.squareSize) / 2 ||
          newVertex.x >= (squareSize ?? options.squareSize) / 2 + x ||
          newVertex.y < y - (squareSize ?? options.squareSize) / 2 ||
          newVertex.y >= (squareSize ?? options.squareSize) / 2 + y
        ) {
          continue;
        }
        const newTrapezoid = computeTrapezoid(
          vertices.map((v, index) =>
            index === i ? newVertex : { x: Math.round(v.x), y: Math.round(v.y) }
          )
        );
        const newFt = ft(data, newTrapezoid, options, x, y, ctx, squareSize);
        // console.log({newFt, newVertex})
        if (bestFt === undefined || newFt > bestFt) {
          bestFt = newFt;
          bestVertex = newVertex;
        }
      }
      if (bestVertex) {
        // @ts-ignore
        vertices = vertices.map((v, index) =>
          index === i ? bestVertex : { x: Math.round(v.x), y: Math.round(v.y) }
        );
      }
    }
  }
  console.log({ bestFt })
  return computeTrapezoid(vertices);
}

function computeTrapezoid(
  vertices: Vertex[],
  ctx?: CanvasRenderingContext2D
): Trapezoid {
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
  return {
    top: { x1: topLeft.x, y1: topLeft.y, x2: topRight.x, y2: topRight.y },
    bottom: {
      x1: bottomLeft.x,
      y1: bottomLeft.y,
      x2: bottomRight.x,
      y2: bottomRight.y,
    },
    left: { x1: topLeft.x, y1: topLeft.y, x2: bottomLeft.x, y2: bottomLeft.y },
    right: {
      x1: topRight.x,
      y1: topRight.y,
      x2: bottomRight.x,
      y2: bottomRight.y,
    },
  };
}


type Trapezoid = {
  top: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  right: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  left: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  bottom: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
};

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


function drawVertices(vertices: Vertex[], ctx: CanvasRenderingContext2D) {
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
  for (let j = startY; j < endY; j += 1) {
      for (let i = startX; i < endX; i += 1) {
      const pixelIndex = (j * width + i) * 4;
      square.push(imageData[pixelIndex]);
    }
  }
  return square as unknown as Uint8ClampedArray;
}

