import { ProcessingOptions } from "@dto/ProcessingOptions";
import { detectTrapezoid } from "@logic/trapezoids/detection";
import {
  createEffect,
  createSignal,
  For,
  onMount,
  Show,
  untrack,
} from "solid-js";
import { createOptionsStore } from "src/data/createOptionsStore";
import { Button } from "./Button";
import EdgeFilter from "./EdgeFilter";
import { KernelParam } from "./KernelParam";
import { Param } from "./Param";
import { availableColors, TrapezoidSetConfig } from "./TrapezoidSetConfig";

export enum Status {
  Editing,
  Matching,
  Saved,
}

export type TrapezoidSet = {
  trapezoids: Trapezoid[];
  id: number;
  color: string;
  thickness: number;
  status: Status;
  matchedPoints: Vertex[];
};

const IMAGE_TEST = "/img/grab1.png";

export const Canvas = () => {
  let canvasRef!: HTMLCanvasElement;
  const [hidden, setHidden] = createSignal(true);
  const [refresh, setRefresh] = createSignal(0);
  const [nextId, setNextId] = createSignal(1);

  const [points, setPoints] = createSignal<[number, number][]>([]);
  const [edgeData, setEdgeData] = createSignal<ImageData>();
  const [clickedPoint, setClickedPoint] = createSignal<Vertex>();
  const [imageToggle, setImageToggle] = createSignal(false);
  const [trapezoidSets, setTrapezoidSets] = createSignal<TrapezoidSet[]>([]);
  const [imageData, setImageData] = createSignal<ImageData>();

  createEffect(() => {
    trapezoidSets();
    imageToggle();
    draw();
  });

  const [options, setOptions, resetOptions] = createOptionsStore();

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
    let { trapezoid, fit } = detectTrapezoid(imgX, imgY, ctx, options.options);
    const valid =
      trapezoid &&
      trapezoidIsValid(trapezoid, ctx, imgX, imgY, options.options, fit);
    if (!valid) {
      const square = getSquare(
        imageData,
        imgX,
        imgY,
        options.options.squareSize
      );
      trapezoid = RANSAC(
        ctx,
        square,
        0,
        options.options,
        imgX - options.options.squareSize / 2,
        imgY - options.options.squareSize / 2
      )!;
      if (!trapezoid) return;
      trapezoid = convertLocalToGlobal(
        trapezoid,
        imgX - options.options.squareSize / 2,
        imgY - options.options.squareSize / 2
      );
      const { trapezoid: newTrapezoid } = DirectSearchOptimization(
        getPointsOnTrapezoid,
        trapezoid,
        square,
        options.options,
        ctx,
        imgX - options.options.squareSize / 2,
        imgY - options.options.squareSize / 2
      );
      trapezoid = newTrapezoid;
    }
    if (!trapezoid) return;
    if (!fit) {
      const square = getSquare(
        imageData,
        imgX,
        imgY,
        options.options.squareSize
      );
      fit = getPointsOnTrapezoid(square, trapezoid, options.options, imgX- options.options.squareSize/2, imgY - options.options.squareSize/2, ctx);
    }
    const connectedTrapezoids = findConnectedTrapezoids(
      trapezoid,
      ctx,
      imgX,
      imgY,
      options.options,
      fit
    );
    const colors = new Set(availableColors);
    trapezoidSets().forEach((set) => {
      colors.delete(set.color);
    });
    const color = colors.size > 0 ? colors.values().next().value : "red";
    const filteredTrapezoids = filterTrapezoids(connectedTrapezoids, trapezoidSets());
    setTrapezoidSets((prev) => [
      ...prev,
      {
        trapezoids: [...filteredTrapezoids, trapezoid],
        id: nextId(),
        color,
        thickness: 5,
        status: Status.Editing,
        matchedPoints: [], 
      } as TrapezoidSet,
    ]);
    setNextId((prev) => prev + 1);
  };

  function filterTrapezoids(
    trapezoids: Trapezoid[],
    sets: TrapezoidSet[],
  ): Trapezoid[] {
    const centerPoints = trapezoids.map((t, i) => ({ x: ((t.top.x1 + t.top.x2) / 2 + (t.bottom.x1 + t.bottom.x2) / 2) / 2, y: ((t.top.y1 + t.top.y2) / 2 + (t.bottom.y1 + t.bottom.y2) / 2) / 2, i }));
    const setsCenterPoints = sets.map(s => s.trapezoids).flat().map(t => ({ x: ((t.top.x1 + t.top.x2) / 2 + (t.bottom.x1 + t.bottom.x2) / 2) / 2, y: ((t.top.y1 + t.top.y2) / 2 + (t.bottom.y1 + t.bottom.y2) / 2) / 2 }));
    const filtered = centerPoints.filter((p) => {
      const found = setsCenterPoints.find(s => Math.abs(s.x - p.x) < 30 && Math.abs(s.y - p.y) < 30);
      return !found;
    });
    const filtered2 = filtered.filter((p, idx) => {
      const found = filtered.find((p2, idx2) => idx !== idx2 && Math.abs(p2.x - p.x) < 30 && Math.abs(p2.y - p.y) < 30);
      return !found;
    });
    return filtered2.map(p => trapezoids[p.i]);
  }

  function trapezoidIsValid(
    trapezoid: Trapezoid,
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    options: ProcessingOptions,
    fit: number | null
  ) {
    const { squareSize } = options;
    const area = calculateArea(trapezoid);
    const areaThreshold = squareSize ** 2 * 0.2;
    const areaValid = area > areaThreshold;
    const fitValid = fit && Math.abs(fit) > 25;
    // make sure each side is at least 1/3 of the square size
    const sideThresh = squareSize / 6;
    const top = Math.sqrt(
      (trapezoid.top.x1 - trapezoid.top.x2) ** 2 +
        (trapezoid.top.y1 - trapezoid.top.y2) ** 2
    );
    const bottom = Math.sqrt(
      (trapezoid.bottom.x1 - trapezoid.bottom.x2) ** 2 +
        (trapezoid.bottom.y1 - trapezoid.bottom.y2) ** 2
    );
    const left = Math.sqrt(
      (trapezoid.left.x1 - trapezoid.left.x2) ** 2 +
        (trapezoid.left.y1 - trapezoid.left.y2) ** 2
    );
    const right = Math.sqrt(
      (trapezoid.right.x1 - trapezoid.right.x2) ** 2 +
        (trapezoid.right.y1 - trapezoid.right.y2) ** 2
    );
    const sideValid =
      top > sideThresh &&
      bottom > sideThresh &&
      left > sideThresh &&
      right > sideThresh;
    const centerPoint = { x: ((trapezoid.top.x1 + trapezoid.top.x2) / 2 + (trapezoid.bottom.x1 + trapezoid.bottom.x2) / 2) / 2, y: ((trapezoid.top.y1 + trapezoid.top.y2) / 2 + (trapezoid.bottom.y1 + trapezoid.bottom.y2) / 2) / 2 }
    const centerPointValid = Math.abs(centerPoint.x - x) < 30 && Math.abs(centerPoint.y - y) < 30;
    const valid = areaValid && fitValid && sideValid && centerPointValid;
    // console.log({ area, areaValid, fitValid, sideValid, valid })
    return valid;
  }

  createEffect(async () => {
    console.log("refreshing");
    refresh();
    const o = options.options;
    await setupCanvas(canvasRef, o);
    const imageData = canvasRef
      .getContext("2d")!
      .getImageData(0, 0, canvasRef.width, canvasRef.height);
    setEdgeData(imageData);
    untrack(() => {
      const ctx = canvasRef.getContext("2d")!;
      for (const [x, y] of points()) detectTrapezoid(x, y, ctx, o);
    });
  });

  onMount(() => {
    canvasRef.addEventListener("mousedown", handleMouseDown);
    setOriginalImage()
  });

  async function setOriginalImage() {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setImageData(imageData);
    }
    img.src = IMAGE_TEST;
    const o = options.options;
    await setupCanvas(canvasRef, o);
  }

  function draw() {
    const ctx = canvasRef.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    const renderTrapezoids = () => {
      for (const trapezoidSet of trapezoidSets()) {
        const { trapezoids, color, thickness } = trapezoidSet;
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        for (const trapezoid of trapezoids)
          DrawTrapezoid(trapezoid, ctx, color, thickness);
        for (const point of trapezoidSet.matchedPoints) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, thickness - 1, 0, 2 * Math.PI);
          ctx.closePath();
          ctx.stroke();
        }
      }
    };
    if (!imageToggle()) {
      if (!edgeData()) return;
      ctx.putImageData(edgeData()!, 0, 0);
      renderTrapezoids();
    } else {
      if (imageData()) {
        console.log("rendering image")
        ctx.putImageData(imageData()!, 0, 0);
        renderTrapezoids();
      } else {
        const img = new Image();
        img.onload = () => {
          ctx.canvas.width = img.width;
          ctx.canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          renderTrapezoids();
        };
        img.src = IMAGE_TEST;
      } 
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvasRef.getBoundingClientRect();
    const rectWidth = rect.right - rect.left;
    const rectHeight = rect.bottom - rect.top;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imgX = Math.round((x / rectWidth) * canvasRef.width);
    const imgY = Math.round((y / rectHeight) * canvasRef.height);
    if (!edgeData()) {
      const ctx = canvasRef.getContext("2d")!;
      const imageData = ctx.getImageData(
        0,
        0,
        canvasRef.width,
        canvasRef.height
      );
      setEdgeData(imageData);
    }
    const { inTrapezoid, trapezoid } = isPointInTrapezoid(
      imgX,
      imgY,
      trapezoidSets()
        .map((t) => t.trapezoids)
        .flat()
    );
    if (inTrapezoid && trapezoid) {
      const { trapezoidSet } = findTrapezoidSet(trapezoid);
      console.log({ trapezoidSet });
      if (trapezoidSet && trapezoidSet.status === Status.Matching) {
        pointMatching(imgX, imgY, trapezoidSet);
        return;
      }
    }
    console.log({ inTrapezoid, trapezoid })
    const { nearestDistance } = findNearestVertex(
      imgX,
      imgY,
      trapezoidSets()
        .map((t) => t.trapezoids)
        .flat()
    );
    if (nearestDistance < 15 || inTrapezoid) {
      setClickedPoint({ x: imgX, y: imgY });
      canvasRef.addEventListener("mousemove", handleMouseMove);
      canvasRef.addEventListener("mouseup", handleMouseUp);
      e.preventDefault();
    } else {
      handleClick(e);
    }
  }

  function findTrapezoidSet(trapezoid: Trapezoid) {
    for (const trapezoidSet of trapezoidSets()) {
      if (trapezoidSet.trapezoids.includes(trapezoid)) return { trapezoidSet };
    }
    return { trapezoidSet: undefined };
  }

  function pointMatching(x: number, y: number, trapezoidSet: TrapezoidSet) {
    const { trapezoids } = trapezoidSet;
    if (trapezoidSet.matchedPoints.length !== 0) {
      // find closest matched point
      const { nearestDistance, nearestPoint } = findNearestPoint(
        x,
        y,
        trapezoidSet.matchedPoints
      );
      if (nearestDistance < 10) {
        // click and drag
        canvasRef.addEventListener("mousemove", handleMouseMove);
        canvasRef.addEventListener("mouseup", handleMouseUp);
        setClickedPoint(nearestPoint);
        return;
      } else {
        setTrapezoidSets(
          trapezoidSets().map((t) => {
            if (t.trapezoids === trapezoids) {
              return {
                ...t,
                matchedPoints: [],
              };
            }
            return t;
          })
        );
      }
    }
    const ctx = canvasRef.getContext("2d")!;
    const { trapezoid, inTrapezoid } = isPointInTrapezoid(x, y, trapezoids);
    if (!inTrapezoid || !trapezoid) return;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = trapezoidSet.color;
    ctx.closePath();
    ctx.fill();
    // find distance from point to every vertex, and the center of the trapezoid
    const center = {
      x:
        (trapezoid.top.x1 +
          trapezoid.top.x2 +
          trapezoid.bottom.x1 +
          trapezoid.bottom.x2) /
        4,
      y:
        (trapezoid.top.y1 +
          trapezoid.top.y2 +
          trapezoid.bottom.y1 +
          trapezoid.bottom.y2) /
        4,
    };
    const topLeft = Math.sqrt(
      (x - trapezoid.top.x1) ** 2 + (y - trapezoid.top.y1) ** 2
    );
    const topRight = Math.sqrt(
      (x - trapezoid.top.x2) ** 2 + (y - trapezoid.top.y2) ** 2
    );
    const bottomLeft = Math.sqrt(
      (x - trapezoid.bottom.x1) ** 2 + (y - trapezoid.bottom.y1) ** 2
    );
    const bottomRight = Math.sqrt(
      (x - trapezoid.bottom.x2) ** 2 + (y - trapezoid.bottom.y2) ** 2
    );
    const centerDist = Math.sqrt((x - center.x) ** 2 + (y - center.y) ** 2);
    const distances = [topLeft, topRight, bottomLeft, bottomRight, centerDist];
    const minDist = Math.min(...distances);
    let dx = 0;
    let dy = 0;
    switch (distances.indexOf(minDist)) {
      case 0:
        dx = trapezoid.top.x1 - x;
        dy = trapezoid.top.y1 - y;
        break;
      case 1:
        dx = trapezoid.top.x2 - x;
        dy = trapezoid.top.y2 - y;
        break;
      case 2:
        dx = trapezoid.bottom.x1 - x;
        dy = trapezoid.bottom.y1 - y;
        break;
      case 3:
        dx = trapezoid.bottom.x2 - x;
        dy = trapezoid.bottom.y2 - y;
        break;
      case 4:
        dx = center.x - x;
        dy = center.y - y;
        break;
    }
    let points: Vertex[] = [];
    // find corresponding points on every other trapezoid
    for (const otherTrapezoid of trapezoids) {
      if (otherTrapezoid === trapezoid) continue;
      switch (distances.indexOf(minDist)) {
        case 0:
          points.push({
            x: otherTrapezoid.top.x1 - dx,
            y: otherTrapezoid.top.y1 - dy,
          });
          break;
        case 1:
          points.push({
            x: otherTrapezoid.top.x2 - dx,
            y: otherTrapezoid.top.y2 - dy,
          });
          break;
        case 2:
          points.push({
            x: otherTrapezoid.bottom.x1 - dx,
            y: otherTrapezoid.bottom.y1 - dy,
          });
          break;
        case 3:
          points.push({
            x: otherTrapezoid.bottom.x2 - dx,
            y: otherTrapezoid.bottom.y2 - dy,
          });
          break;
        case 4:
          points.push({
            x:
              (otherTrapezoid.top.x1 +
                otherTrapezoid.top.x2 +
                otherTrapezoid.bottom.x1 +
                otherTrapezoid.bottom.x2) /
                4 -
              dx,
            y:
              (otherTrapezoid.top.y1 +
                otherTrapezoid.top.y2 +
                otherTrapezoid.bottom.y1 +
                otherTrapezoid.bottom.y2) /
                4 -
              dy,
          });
          break;
      }
    }
    // for (const point of points) {
    //   ctx.beginPath();
    //   ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
    //   ctx.fillStyle = "blue";
    //   ctx.fill();
    //   ctx.closePath();
    // }
    setTrapezoidSets(
      trapezoidSets().map((t) => {
        if (t.trapezoids === trapezoids) {
          console.log({t})
          return {
            ...t,
            matchedPoints: [{ x, y }, ...points],
          };
        }
        return t;
      })
    );
  }

  function isPointInTrapezoid(x: number, y: number, trapezoids: Trapezoid[]) {
    for (const trapezoid of trapezoids) {
      const { top, bottom, left, right } = trapezoid;
      if (y < top.y1 && y < top.y2) continue;
      if (x < left.x1 && x < left.x2) continue;
      if (x > right.x1 && x > right.x2) continue;
      if (y > bottom.y1 && y > bottom.y2) continue;
      return { inTrapezoid: true, trapezoid };
    }
    return { inTrapezoid: false, trapezoid: null };
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
    // are they dragging a point?
    const { inTrapezoid, trapezoid } = isPointInTrapezoid(
      imgX,
      imgY,
      trapezoidSets()
        .map((t) => t.trapezoids)
        .flat()
    );
    const { nearestVertex, nearestDistance } = findNearestVertex(
      imgX,
      imgY,
      trapezoidSets()
        .map((t) => t.trapezoids)
        .flat()
    );
    if (inTrapezoid && trapezoid) {
      const { trapezoidSet } = findTrapezoidSet(trapezoid);
      if (trapezoidSet && trapezoidSet.status === Status.Matching) {
        const { nearestPoint, nearestDistance: pointDistance } =
          findNearestPoint(imgX, imgY, trapezoidSet.matchedPoints);
        if (nearestPoint && pointDistance < 10) {
          const newMatchedPoints = trapezoidSet.matchedPoints.map((point) => {
            if (point.x === nearestPoint.x && point.y === nearestPoint.y) {
              return { x: imgX, y: imgY };
            }
            return point;
          });
          setTrapezoidSets(
            trapezoidSets().map((t) => {
              if (t.trapezoids === trapezoidSet.trapezoids) {
                return {
                  ...t,
                  matchedPoints: newMatchedPoints,
                };
              }
              return t;
            })
          );
          return;
        }
      }
      // Dragging a trapezoid
      else if (nearestVertex && nearestDistance > 15 && trapezoidSet) {
        const dy = imgY - clickedPoint()!.y ?? 0;
        const dx = imgX - clickedPoint()!.x ?? 0;
        setClickedPoint({ x: imgX, y: imgY });
        const newTrapezoid = convertLocalToGlobal(trapezoid, dx, dy);
        // if new trapezoid is touching the edge of the image, delete it
        if (
          newTrapezoid.left.x1 < 0 ||
          newTrapezoid.right.x1 > canvasRef.width ||
          newTrapezoid.left.x2 < 0 ||
          newTrapezoid.right.x2 > canvasRef.width ||
          newTrapezoid.top.y1 < 0 ||
          newTrapezoid.top.y2 < 0 ||
          newTrapezoid.bottom.y1 > canvasRef.height ||
          newTrapezoid.bottom.y2 > canvasRef.height
        ) {
          const newTrapezoids = trapezoidSet.trapezoids.filter(
            (t) =>
              (t.top.x1 !== trapezoid.top.x1 &&
                t.top.y1 !== trapezoid.top.y1) ||
              (t.top.x2 !== trapezoid.top.x2 &&
                t.top.y2 !== trapezoid.top.y2) ||
              (t.bottom.x1 !== trapezoid.bottom.x1 &&
                t.bottom.y1 !== trapezoid.bottom.y1) ||
              (t.bottom.x2 !== trapezoid.bottom.x2 &&
                t.bottom.y2 !== trapezoid.bottom.y2)
          );
          setTrapezoidSets(
            trapezoidSets().map((t) =>
              t.trapezoids === trapezoidSet.trapezoids
                ? { ...t, trapezoids: newTrapezoids }
                : t
            )
          );
          handleMouseUp();
          return;
        }
        const newTrapezoids: Trapezoid[] = trapezoidSet.trapezoids.map((t) =>
          (t.top.x1 === trapezoid.top.x1 && t.top.y1 === trapezoid.top.y1) ||
          (t.top.x2 === trapezoid.top.x2 && t.top.y2 === trapezoid.top.y2) ||
          (t.bottom.x1 === trapezoid.bottom.x1 &&
            t.bottom.y1 === trapezoid.bottom.y1) ||
          (t.bottom.x2 === trapezoid.bottom.x2 &&
            t.bottom.y2 === trapezoid.bottom.y2)
            ? newTrapezoid
            : t
        );
        setTrapezoidSets(
          trapezoidSets().map((t) =>
            t.trapezoids === trapezoidSet.trapezoids
              ? { ...t, trapezoids: newTrapezoids }
              : t
          )
        );
        return;
      }
    }
    // Dragging a vertex
    if (nearestDistance < 3) return;
    if (nearestVertex && nearestDistance < 15) {
      const trapezoid = trapezoidSets()
        .map((t) => t.trapezoids)
        .flat()
        .find(
          (t) =>
            (t.top.x1 === nearestVertex.x && t.top.y1 === nearestVertex.y) ||
            (t.top.x2 === nearestVertex.x && t.top.y2 === nearestVertex.y) ||
            (t.bottom.x1 === nearestVertex.x &&
              t.bottom.y1 === nearestVertex.y) ||
            (t.bottom.x2 === nearestVertex.x && t.bottom.y2 === nearestVertex.y)
        );
      if (!trapezoid) return;
      const { trapezoidSet } = findTrapezoidSet(trapezoid);
      const newTrapezoid = moveVertex(trapezoid, nearestVertex, imgX, imgY);
      const newSet = trapezoidSet?.trapezoids.map((t) =>
        (t.top.x1 === nearestVertex.x && t.top.y1 === nearestVertex.y) ||
        (t.top.x2 === nearestVertex.x && t.top.y2 === nearestVertex.y) ||
        (t.bottom.x1 === nearestVertex.x && t.bottom.y1 === nearestVertex.y) ||
        (t.bottom.x2 === nearestVertex.x && t.bottom.y2 === nearestVertex.y)
          ? newTrapezoid
          : t
      );
      if (!newSet) return;
      const newTrapezoids = trapezoidSets().map((t) =>
        t.trapezoids === trapezoidSet?.trapezoids
          ? { ...t, trapezoids: newSet }
          : t
      );
      setTrapezoidSets(newTrapezoids); //TODO double check
    }
    refresh();
  }

  function moveVertex(
    trapezoid: Trapezoid,
    vertex: Vertex,
    x: number,
    y: number
  ) {
    const newTrapezoid = { ...trapezoid };
    if (newTrapezoid.top.x1 === vertex.x && newTrapezoid.top.y1 === vertex.y) {
      newTrapezoid.top.x1 = x;
      newTrapezoid.top.y1 = y;
    } else if (
      newTrapezoid.top.x2 === vertex.x &&
      newTrapezoid.top.y2 === vertex.y
    ) {
      newTrapezoid.top.x2 = x;
      newTrapezoid.top.y2 = y;
    } else if (
      newTrapezoid.bottom.x1 === vertex.x &&
      newTrapezoid.bottom.y1 === vertex.y
    ) {
      newTrapezoid.bottom.x1 = x;
      newTrapezoid.bottom.y1 = y;
    } else if (
      newTrapezoid.bottom.x2 === vertex.x &&
      newTrapezoid.bottom.y2 === vertex.y
    ) {
      newTrapezoid.bottom.x2 = x;
      newTrapezoid.bottom.y2 = y;
    }
    return newTrapezoid;
  }

  function handleMouseUp() {
    canvasRef.removeEventListener("mousemove", handleMouseMove);
    canvasRef.removeEventListener("mouseup", handleMouseUp);

    setClickedPoint(undefined);
  }

  function findNearestVertex(x: number, y: number, trapezoids: Trapezoid[]) {
    let nearestVertex: Vertex | undefined;
    let nearestDistance = Infinity;
    for (const trapezoid of trapezoids) {
      const vertices = [
        { x: trapezoid.top.x1, y: trapezoid.top.y1 },
        { x: trapezoid.top.x2, y: trapezoid.top.y2 },
        { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 },
        { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 },
      ];
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
    return { nearestDistance, nearestVertex };
  }

  function findNearestPoint(x: number, y: number, points: Vertex[]) {
    let nearestPoint: Vertex | undefined;
    let nearestDistance = Infinity;
    for (const point of points) {
      const distance = Math.sqrt(
        Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2)
      );
      if (distance < nearestDistance) {
        nearestPoint = point;
        nearestDistance = distance;
      }
    }
    return { nearestDistance, nearestPoint };
  }

  return (
    <div class="flex flex-col gap-3 text-xs">
      <h3 class="font-bold text-xl mt-4">Canvas</h3>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-3">
          <p>For fine tuning of all other parameters:</p>
          <Button onClick={() => setHidden(!hidden())}>
            {hidden() ? "Show" : "Hide"} Extra Parameters
          </Button>
        </div>
        <div class="flex-col">
          <p>
            This sets the size of the red bounding box where the algorithm
            searches for a trapezoid.
          </p>
          <Param
            label="Square Size"
            value={options.options.squareSize}
            onChange={(value) => setOptions("options", "squareSize", value)}
          />
        </div>
        <div class="flex=col">
          <p>
            This sets the low-end threshold for determining if a pixel is on an
            edge. If the pictures contrast is lower than usual, this may need to
            be lowered.
          </p>
          <Param
            label="Hysteresis Low"
            value={options.options.hysteresisLow}
            onChange={(value) => setOptions("options", "hysteresisLow", value)}
          />
        </div>
        <div class="flex-col">
          <p>
            This sets the high-end threshold for determining if a pixel is on an
            edge. If the pictures contrast is higher than usual, this may need
            to be raised.
          </p>
          <Param
            label="Hysteresis High"
            value={options.options.hysteresisHigh}
            onChange={(value) => setOptions("options", "hysteresisHigh", value)}
          />
        </div>
        <Show when={!hidden()}>
          <Param
            label="Min Neighbors for Noise Reduction"
            value={options.options.minNeighborsForNoiseReduction}
            onChange={(value) =>
              setOptions("options", "minNeighborsForNoiseReduction", value)
            }
          />
          <Param
            label="Hough Vote Threshold"
            value={options.options.houghVoteThreshold}
            onChange={(value) =>
              setOptions("options", "houghVoteThreshold", value)
            }
          />
          <Param
            label="Merge Theta Threshold"
            value={options.options.mergeThetaThreshold}
            onChange={(value) =>
              setOptions("options", "mergeThetaThreshold", value)
            }
          />
          <Param
            label="Pixels Per Line Percentage Threshold"
            value={options.options.pixelThreshold}
            onChange={(value) => setOptions("options", "pixelThreshold", value)}
          />
          <Param
            label="Max Lines Per Square"
            value={options.options.maxLines}
            onChange={(value) => setOptions("options", "maxLines", value)}
          />
          <Param
            label="Noise Reduction Iterations"
            value={options.options.noiseReductionIterations}
            onChange={(value) =>
              setOptions("options", "noiseReductionIterations", value)
            }
          />
          <Param
            label="Density Threshold"
            value={options.options.densityThreshold}
            onChange={(value) =>
              setOptions("options", "densityThreshold", value)
            }
          />
          <Param
            label="Density Step"
            value={options.options.densityStep}
            onChange={(value) => setOptions("options", "densityStep", value)}
          />
          <Param
            label="Density Size"
            value={options.options.densitySize}
            onChange={(value) => setOptions("options", "densitySize", value)}
          />
        </Show>
      </div>
      <Show when={!hidden()}>
        <KernelParam
          values={options.options.gaussianKernel}
          onChange={(value) =>
            setOptions(
              "options",
              "gaussianKernel",
              value as [number, number, number]
            )
          }
        />
        <Button onClick={resetOptions}>Reset Parameters</Button>
      </Show>
      <Button
        onClick={() => {
          setPoints([]);
          setTrapezoidSets([]);
          setRefresh(refresh() + 1);
        }}
      >
        Clear All
      </Button>
      <Button
        onClick={() => {
          setImageToggle(!imageToggle());
        }}
      >
        Show {imageToggle() ? "Edge Data" : "Original"} Image{" "}
      </Button>
      <For each={trapezoidSets()}>
        {(trapezoidSet) => (
          <TrapezoidSetConfig
            trapezoidSet={trapezoidSet}
            setTrapezoidSet={(newTrapezoidSet) => {
              const newTrapezoidSets = trapezoidSets().map((t) =>
                t.id === newTrapezoidSet.id ? { ...t, ...newTrapezoidSet } : t
              );
              console.log(newTrapezoidSet);
              setTrapezoidSets(newTrapezoidSets);
            }}
            onDelete={({ id }) => {
              setTrapezoidSets(trapezoidSets().filter((t) => t.id !== id));
            }}
          />
        )}
      </For>
      <canvas ref={canvasRef} id="canvas" width="1000" height="1000"></canvas>
    </div>
  );
};

export const setupCanvas = async (
  canvas: HTMLCanvasElement,
  options: ProcessingOptions
): Promise<ImageData> => {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const img = new Image();
  let imageData: ImageData

  return new Promise(() => {
    img.onload = function () {
      if (!ctx) return;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      EdgeFilter(canvas, options, imageData, ctx);
      return imageData
    };
    img.src = IMAGE_TEST;
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
  color: string = "green",
  thickness: number = 1
) {
  ctx.beginPath();
  ctx.moveTo(trapezoid.top.x1, trapezoid.top.y1);
  ctx.lineTo(trapezoid.top.x2, trapezoid.top.y2);
  ctx.lineTo(trapezoid.bottom.x2, trapezoid.bottom.y2);
  ctx.lineTo(trapezoid.bottom.x1, trapezoid.bottom.y1);
  ctx.lineTo(trapezoid.top.x1, trapezoid.top.y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.stroke();
  ctx.closePath();
  // ctx.beginPath();
  // ctx.moveTo(trapezoid.top.x1, trapezoid.top.y1);
  // ctx.lineTo(trapezoid.top.x2, trapezoid.top.y2);
  // ctx.strokeStyle = 'pink';
  // ctx.lineWidth = 3;
  // ctx.stroke();
  // ctx.closePath();
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
  options: ProcessingOptions,
  fit: number
) {
  const squareSize = options.squareSize + 10;
  let trapezoids: Trapezoid[] = [];
  const yShift =
    Math.round(
      (trapezoid.top.y1 + trapezoid.top.y2) / 2 -
        (trapezoid.bottom.y1 + trapezoid.bottom.y2) / 2
    ) - 5;
  const xShift = Math.round(
    (trapezoid.top.y1 -
      trapezoid.top.y2 +
      (trapezoid.bottom.y1 - trapezoid.bottom.y2)) /
      2
  );
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
  )
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
  )
  return trapezoids;
}

function recurseSearchTrapezoid(
  x: number,
  y: number,
  deltaX: number,
  deltaY: number,
  trapezoid: any,
  ctx: CanvasRenderingContext2D,
  options: ProcessingOptions,
  trapezoids: Trapezoid[],
  count: number,
  squareSize: number,
  fit: number
): Trapezoid[] {
  if (!trapezoid || count > 20) return trapezoids;
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const square = getSquare(imageData, x + deltaX, y + deltaY, squareSize);
  const shiftedTrapezoid = convertLocalToGlobal(trapezoid, deltaX, deltaY);
  const firstTest = FixedDirectSearchOptimization(
    getPointsOnTrapezoid,
    shiftedTrapezoid,
    square,
    options,
    ctx,
    x + deltaX - squareSize / 2,
    y + deltaY - squareSize / 2,
    squareSize,
  );
  if (!firstTest) {
    return trapezoids;
  }
  const secondTest = RecurseDirectSearchOptimization(
    getPointsOnTrapezoid,
    firstTest,
    square,
    options,
    ctx,
    x + deltaX - squareSize / 2,
    y + deltaY - squareSize / 2,
    squareSize,
    fit
  );
  if (secondTest) {
    DrawTrapezoid(secondTest, ctx);
    trapezoids.push(secondTest);
    let xShift = Math.round(
      ((trapezoid.top.x1 + trapezoid.top.x2) / 2 +
        (trapezoid.bottom.x1 + trapezoid.bottom.x2) / 2) /
        2 -
        ((secondTest.top.x1 + secondTest.top.x2) / 2 +
          (secondTest.bottom.x1 + secondTest.bottom.x2) / 2) /
          2
    );
    let temp = Math.round(
      (secondTest.top.y1 + secondTest.top.y2) / 2 -
        (secondTest.bottom.y1 + secondTest.bottom.y2) / 2
    );
    let yShift = deltaY < 0 ? temp : -temp;
    const yCenter = Math.round(
      ((secondTest.top.y1 + secondTest.top.y2) / 2 +
        (secondTest.bottom.y1 + secondTest.bottom.y2) / 2) /
        2
    );
    yShift += yCenter - (y + deltaY);

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
  options: ProcessingOptions,
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
          Math.round(y + yStep * j) * (squareSize ?? options.squareSize) +
            Math.round(x + xStep * j)
        ] === 255 ||
        data[
          Math.round(y + yStep * j) * (squareSize ?? options.squareSize) +
            Math.round(x + xStep * j + 1)
        ] === 255 ||
        data[
          Math.round(y + yStep * j) * (squareSize ?? options.squareSize) +
            Math.round(x + xStep * j - 1)
        ] === 255 ||
        data[
          Math.round(y + yStep * j + 1) * (squareSize ?? options.squareSize) +
            Math.round(x + xStep * j)
        ] === 255 ||
        data[
          Math.round(y + yStep * j - 1) * (squareSize ?? options.squareSize) +
            Math.round(x + xStep * j)
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

function drawSquare(
  square: Uint8ClampedArray,
  ctx: CanvasRenderingContext2D,
  width: number
) {
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
  options: ProcessingOptions,
  x: number,
  y: number,
  squareSize?: number
): Trapezoid | undefined {
  const areaThreshold = [trapezoidArea * 0.9, trapezoidArea * 1.1];
  const iterations = 25000;
  let bestTrapezoid: Trapezoid | undefined;
  let bestFit: number | undefined;
  for (let i = 0; i < iterations; i++) {
    const sample: Vertex[] = getSemiRandomSample(
      4,
      squareSize ?? options.squareSize
    );
    // If sample not within 20% of area, continue
    const trapezoid = computeTrapezoid(sample);
    const area = calculateArea(trapezoid);
    if (
      (trapezoidArea !== 0 &&
        (area < areaThreshold[0] || area > areaThreshold[1])) ||
      (trapezoidArea == 0 && (area < 45 * 45 || area > 60 * 55))
    )
      continue;
    // const trapezoidFit = fitTrapezoid(
    //   trapezoid,
    //   edgePixels,
    //   options,
    //   ctx,
    //   x,
    //   y,
    //   squareSize
    //   );
    const points = getPointsOnTrapezoid(
      edgePixels,
      convertLocalToGlobal(trapezoid, x, y),
      options,
      x,
      y,
      ctx,
      squareSize
    );
    // if (trapezoidFit && (!bestFit || trapezoidFit < bestFit)) {
    //   // console.log({trapezoid})
    //   bestTrapezoid = trapezoid;
    //   bestFit = trapezoidFit;
    //   // DrawTrapezoid(convertLocalToGlobal(trapezoid, x, y), ctx, 'green');
    // }
    // console.log({points})
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
  options: ProcessingOptions,
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

      let distance = distanceFromTrapezoid({ x, y }, trapezoid, ctx, x1, y1);
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
    options: ProcessingOptions,
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D,
    squareSize?: number
  ) => number,
  trapezoid: Trapezoid,
  data: Uint8ClampedArray,
  options: ProcessingOptions,
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
  // console.log("bestFt init", bestFt, trapezoid);
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
          index === i
            ? (bestVertex as Vertex)
            : { x: Math.round(v.x), y: Math.round(v.y) }
        );
        // console.log("bestFt", bestFt, vertices)
      }
    }
  }
  return { trapezoid: computeTrapezoid(vertices), fit: bestFt };
}

function FixedDirectSearchOptimization(
  ft: (
    data: Uint8ClampedArray,
    trapezoid: Trapezoid,
    options: ProcessingOptions,
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D,
    squareSize?: number
  ) => number,
  trapezoid: Trapezoid,
  data: Uint8ClampedArray,
  options: ProcessingOptions,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  squareSize: number,
) {
  let vertices = [
    { x: trapezoid.top.x1, y: trapezoid.top.y1 },
    { x: trapezoid.top.x2, y: trapezoid.top.y2 },
    { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 },
    { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 },
  ];
  let bestFt: number = ft(data, trapezoid, options, x, y, ctx, squareSize);
  for (let k = 0; k < 9; k++) {
    let bestVertices: Vertex[] | undefined;
    for (let j = 0; j < 16; j++) {
      const direction = (j * Math.PI) / 8;
      const dx = Math.cos(direction) * (((k % 8) + 1) * 1);
      const dy = Math.sin(direction) * (((k % 8) + 1) * 1);
      const shiftedVertices: Vertex[] = vertices.map((v) => ({
        x: v.x + dx,
        y: v.y + dy,
      }));
      for (let k = 0; k < 2; k++) {
        for (let j = 0; j < 10; j++) {
          let angle = (j * Math.PI) / 180;
          if (k === 1) {
            angle = -angle;
          }
          const rotatedVertices: Vertex[] = shiftedVertices.map((v) => ({
            x: Math.round((v.x - x) * Math.cos(angle) - (v.y - y) * Math.sin(angle)) + x,
            y: Math.round((v.x - x) * Math.sin(angle) + (v.y - y) * Math.cos(angle)) + y,
          }));
          const rotatedT: Trapezoid = computeTrapezoid(rotatedVertices);
          const newFt = ft(data, rotatedT, options, x, y, ctx, squareSize);
          if (bestFt === undefined || newFt > bestFt) {
            bestFt = newFt;
            bestVertices = rotatedVertices;
          }
        }
      }
      if (bestVertices) {
        vertices = bestVertices;
      }
    }
    if (bestVertices) {
      vertices = bestVertices;
    }
  }
  return computeTrapezoid(vertices);
}

function RecurseDirectSearchOptimization(
  ft: (
    data: Uint8ClampedArray,
    trapezoid: Trapezoid,
    options: ProcessingOptions,
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D,
    squareSize?: number
  ) => number,
  trapezoid: Trapezoid,
  data: Uint8ClampedArray,
  options: ProcessingOptions,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  squareSize: number,
  fit: number,
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
  if (bestFt < fit / 3) return null;
  return computeTrapezoid(vertices);
}

function computeTrapezoid(
  vertices: Vertex[],
  // ctx?: CanvasRenderingContext2D
): Trapezoid {
  //  the shortest edge is the bottom edge
  const pairs = [
    [vertices[0], vertices[1]],
    [vertices[1], vertices[3]],
    [vertices[3], vertices[2]],
    [vertices[2], vertices[0]],
    [vertices[3], vertices[0]],
    [vertices[2], vertices[1]],
  ];
  let shortestEdge: any | undefined;
  let shortestEdgeLength: number | undefined;
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const dx = pair[1].x - pair[0].x;
    const dy = pair[1].y - pair[0].y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (shortestEdgeLength === undefined || length < shortestEdgeLength) {
      shortestEdgeLength = length;
      shortestEdge = pair;
    }
  }
  let bottomLeft = shortestEdge[0];
  let bottomRight = shortestEdge[1];
  if (bottomLeft.x > bottomRight.x) {
    const temp = bottomLeft;
    bottomLeft = bottomRight;
    bottomRight = temp;
  }
  let topRight = vertices.find(
    (v) => v !== bottomLeft && v !== bottomRight
  ) as Vertex;
  let topLeft = vertices.find(
    (v) => v !== bottomLeft && v !== bottomRight && v !== topRight
  ) as Vertex;
  if(topRight.x < topLeft.x) {
    const temp = topRight;
    topRight = topLeft;
    topLeft = temp;
  }
  if(topLeft.y > bottomLeft.y) {
    let temp = topLeft;
    topLeft = bottomLeft;
    bottomLeft = temp;
    temp = topRight;
    topRight = bottomRight;
    bottomRight = temp;
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

export type Trapezoid = {
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

export type Vertex = {
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
