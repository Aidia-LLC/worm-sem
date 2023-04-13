import { ProcessingOptions } from "@dto/ProcessingOptions";
import { base64ToImageSrc } from "@logic/image";
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
import { GrabForm } from "./GrabForm";
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

export const Canvas = () => {
  const [imageSrc, setImageSrc] = createSignal<string | null>(null);

  let canvasRef!: HTMLCanvasElement;
  const [hidden, setHidden] = createSignal(true);
  const [refresh, setRefresh] = createSignal(0);
  const [nextId, setNextId] = createSignal(1);

  const [points, setPoints] = createSignal<[number, number][]>([]);
  const [edgeData, setEdgeData] = createSignal<ImageData>();
  const [clickedPoint, setClickedPoint] = createSignal<Vertex>();
  const [showOriginalImage, setShowOriginalImage] = createSignal(true);
  const [trapezoidSets, setTrapezoidSets] = createSignal<TrapezoidSet[]>([]);
  const [imageData, setImageData] = createSignal<ImageData>();
  const [grabbing, setGrabbing] = createSignal<TrapezoidSet["id"] | null>(null);
  const [grabSize, setGrabSize] = createSignal(30);

  createEffect(() => {
    // re-draw the canvas when any of these signals change
    trapezoidSets();
    showOriginalImage();
    grabbing();
    grabSize();

    draw();
  });

  const [options, setOptions, resetOptions] = createOptionsStore();

  const handleClick = (e: MouseEvent) => {
    let toggleOriginalImage = false;
    if (showOriginalImage()) {
      toggleOriginalImage = true;
      setShowOriginalImage(false);
    }
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
      trapezoidIsValid(trapezoid, imgX, imgY, options.options, fit);
    if (!valid) {
      const square = getSquare(
        imageData,
        imgX,
        imgY,
        options.options.squareSize
      );
      trapezoid = RANSAC(
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
      fit = getPointsOnTrapezoid(square, trapezoid, options.options, imgX- options.options.squareSize/2, imgY - options.options.squareSize/2);
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
    const filteredTrapezoids = filterTrapezoids(
      connectedTrapezoids,
      trapezoidSets()
    );
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
    if (toggleOriginalImage) {
      setShowOriginalImage(true);
    }
  };

  function filterTrapezoids(
    trapezoids: Trapezoid[],
    sets: TrapezoidSet[]
  ): Trapezoid[] {
    const centerPoints = trapezoids.map((t, i) => ({
      x: ((t.top.x1 + t.top.x2) / 2 + (t.bottom.x1 + t.bottom.x2) / 2) / 2,
      y: ((t.top.y1 + t.top.y2) / 2 + (t.bottom.y1 + t.bottom.y2) / 2) / 2,
      i,
    }));
    const setsCenterPoints = sets
      .map((s) => s.trapezoids)
      .flat()
      .map((t) => ({
        x: ((t.top.x1 + t.top.x2) / 2 + (t.bottom.x1 + t.bottom.x2) / 2) / 2,
        y: ((t.top.y1 + t.top.y2) / 2 + (t.bottom.y1 + t.bottom.y2) / 2) / 2,
      }));
    const filtered = centerPoints.filter((p) => {
      const found = setsCenterPoints.find(
        (s) => Math.abs(s.x - p.x) < 30 && Math.abs(s.y - p.y) < 30
      );
      return !found;
    });
    const filtered2 = filtered.filter((p, idx) => {
      const found = filtered.find(
        (p2, idx2) =>
          idx !== idx2 && Math.abs(p2.x - p.x) < 30 && Math.abs(p2.y - p.y) < 30
      );
      return !found;
    });
    return filtered2.map((p) => trapezoids[p.i]);
  }

  function trapezoidIsValid(
    trapezoid: Trapezoid,
    x: number,
    y: number,
    options: ProcessingOptions,
    fit: number | null
  ) {
    const { squareSize } = options;
    const area = calculateArea(trapezoid);
    const areaThreshold = squareSize ** 2 * 0.2;
    const areaValid = area > areaThreshold;
    const fitValid = fit && Math.abs(fit) > options.firstFit;
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
    const centerPoint = {
      x:
        ((trapezoid.top.x1 + trapezoid.top.x2) / 2 +
          (trapezoid.bottom.x1 + trapezoid.bottom.x2) / 2) /
        2,
      y:
        ((trapezoid.top.y1 + trapezoid.top.y2) / 2 +
          (trapezoid.bottom.y1 + trapezoid.bottom.y2) / 2) /
        2,
    };
    const centerPointValid =
      Math.abs(centerPoint.x - x) < 30 && Math.abs(centerPoint.y - y) < 30;
    const valid = areaValid && fitValid && sideValid && centerPointValid;
    // console.log({ area, areaValid, fitValid, sideValid, valid })
    return valid;
  }

  createEffect(async () => {
    console.log("refreshing");
    refresh();
    const src = imageSrc();
    if (!src) return;
    const o = options.options;
    await setupCanvas(canvasRef, o, src);
    const imageData = canvasRef
      .getContext("2d")!
      .getImageData(0, 0, canvasRef.width, canvasRef.height);
    setEdgeData(imageData);
    untrack(() => {
      draw();
      const ctx = canvasRef.getContext("2d")!;
      for (const [x, y] of points()) detectTrapezoid(x, y, ctx, o);
    });
  });

  onMount(() => {
    canvasRef.addEventListener("mousedown", handleMouseDown);
    setOriginalImage();
  });

  async function setOriginalImage() {
    const src = imageSrc();
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setImageData(imageData);
    };
    img.src = base64ToImageSrc(src);
    const o = options.options;
    await setupCanvas(canvasRef, o, src);
  }

  function draw() {
    const ctx = canvasRef.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    const renderTrapezoids = () => {
      if (grabbing() === null) {
        for (const trapezoidSet of trapezoidSets()) {
          const { trapezoids, color, thickness } = trapezoidSet;
          for (const trapezoid of trapezoids)
            DrawTrapezoid(trapezoid, ctx, color, thickness);
          for (const point of trapezoidSet.matchedPoints) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, thickness - 1, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.stroke();
          }
        }
      } else {
        const set = trapezoidSets().find((s) => s.id === grabbing());
        if (!set) return;

        ctx.globalAlpha = 0.4;
        for (const trapezoid of set.trapezoids)
          DrawTrapezoid(trapezoid, ctx, set.color, set.thickness);

        ctx.globalAlpha = 1;
        ctx.lineWidth = 3;
        const size = grabSize();

        for (const point of set.matchedPoints) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 1.5, 0, 2 * Math.PI);
          ctx.closePath();
          ctx.stroke();

          ctx.beginPath();
          ctx.rect(point.x - size / 2, point.y - size / 2, size, size);
          ctx.closePath();
          ctx.stroke();
        }
      }
    };
    if (!showOriginalImage()) {
      if (!edgeData()) return;
      ctx.putImageData(edgeData()!, 0, 0);
      renderTrapezoids();
    } else {
      if (imageData()) {
        console.log("rendering image");
        ctx.putImageData(imageData()!, 0, 0);
        renderTrapezoids();
      } else {
        const src = imageSrc();
        if (!src) return;
        const img = new Image();
        img.onload = () => {
          ctx.canvas.width = img.width;
          ctx.canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          renderTrapezoids();
        };
        img.src = base64ToImageSrc(src);
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
    console.log({ inTrapezoid, trapezoid });
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
    let angle1 = 0;
    // angle1 of the top line
    if (trapezoid.top.x1 === trapezoid.top.x2) {
      angle1 = Math.PI / 2;
    }
    else {
      angle1 = Math.atan(
        (trapezoid.top.y2 - trapezoid.top.y1) /
          (trapezoid.top.x2 - trapezoid.top.x1)
      );
    }
    
    const dx = (x - center.x);
    const dy = (y - center.y);
    
    const points: Vertex[] = [];
    points.push({
      x,
      y
    });
    for (const otherTrapezoid of trapezoids) {
      if (otherTrapezoid === trapezoid) continue;
      let angle2 = 0;
      // angle2 of the top line
      if (otherTrapezoid.top.x1 === otherTrapezoid.top.x2) {
        angle2 = Math.PI / 2;
      }
      else {
        angle2 = Math.atan(
          (otherTrapezoid.top.y2 - otherTrapezoid.top.y1) /
            (otherTrapezoid.top.x2 - otherTrapezoid.top.x1)
        );
      }
      const angle = angle2 - angle1;

      const otherCenter = {
        x:
          (otherTrapezoid.top.x1 +
            otherTrapezoid.top.x2 +
            otherTrapezoid.bottom.x1 +
            otherTrapezoid.bottom.x2) /
          4,
        y:
          (otherTrapezoid.top.y1 +
            otherTrapezoid.top.y2 +
            otherTrapezoid.bottom.y1 +
            otherTrapezoid.bottom.y2) /
          4,
      };
      const otherDx = (dx * Math.cos(angle)) - (dy * Math.sin(angle));
      const otherDy = (dx * Math.sin(angle)) + (dy * Math.cos(angle));
      const otherX = otherCenter.x + otherDx;
      const otherY = otherCenter.y + otherDy;
      points.push({
        x: otherX,
        y: otherY
      });
    }
    setTrapezoidSets(
      trapezoidSets().map((t) => {
        if (t.trapezoids === trapezoids) {
          return {
            ...t,
            matchedPoints: points,
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
      <Show when={imageSrc()}>
        <div class="grid grid-cols-3 gap-4 mt-1">
          <Button
            onClick={() => {
              setImageSrc(null);
              setPoints([]);
              setTrapezoidSets([]);
              setRefresh(refresh() + 1);
            }}
          >
            Clear Image
          </Button>
          <div class="w-full flex flex-col">
            <Show when={trapezoidSets().length > 0}>
              <Button
                onClick={() => {
                  setPoints([]);
                  setTrapezoidSets([]);
                  setRefresh(refresh() + 1);
                }}
              >
                Remove All Sets
              </Button>
            </Show>
          </div>
          <Button
            onClick={() => {
              setShowOriginalImage(!showOriginalImage());
            }}
          >
            Show {showOriginalImage() ? "Edge Data" : "Original Image"}
          </Button>
        </div>
      </Show>

      <For each={trapezoidSets()}>
        {(trapezoidSet) => (
          <TrapezoidSetConfig
            grabbing={grabbing() === trapezoidSet.id}
            onGrab={(id) => setGrabbing(id)}
            canvasSize={canvasRef}
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
            boxSize={grabSize()}
            onSetBoxSize={(size) => setGrabSize(size)}
          />
        )}
      </For>
      <canvas
        ref={canvasRef}
        id="canvas"
        width="1000"
        height="1000"
        classList={{
          hidden: !imageSrc(),
        }}
      ></canvas>
      <Show
        when={imageSrc()}
        fallback={<GrabForm onGrabbed={(src) => setImageSrc(src)} />}
      >
        <>
          <h3 class="font-bold text-xl mt-4">Options</h3>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-3">
              <p>For fine tuning of all other parameters:</p>
              <Button onClick={() => setHidden(!hidden())}>
                {hidden() ? "Show" : "Hide"} Additional Parameters
              </Button>
            </div>
            <div class="flex-col">
              <p>
                This sets the size of a 'bounding box' where the algorithm will look for a trapezoid. This may need to be changed if the picture is more or less zoomed in than usual.
              </p>
              <Param
                label="Square Size"
                value={options.options.squareSize}
                onChange={(value) => setOptions("options", "squareSize", value)}
              />
            </div>
            <div class="flex=col">
              <p>
                This sets the minimum fit relative to the first fit for a trapezoid to be valid. If this is too high, the algorithm will fail to find a trapezoid where there are few edge pixels. Too low, and trapezoids will be found past the line of trapezoids.
              </p>
              <Param
                label="Minimum Fit for Recurrance"
                value={options.options.minimumFit}
                onChange={(value) =>
                  setOptions("options", "minimumFit", value)
                }
              />
            </div>
            <div class="flex-col">
              <p>
                This sets the minimum fit for the first trapezoid, if this fails a secondary algorithm will be used to find a trapezoid. This may not need to be changed.
              </p>
              <Param
                label="Minimum Fit for First"
                value={options.options.firstFit}
                onChange={(value) =>
                  setOptions("options", "firstFit", value)
                }
              />
            </div>
            <Show when={!hidden()}>
            <div class="flex=col">
              <p>
                This sets the low-end threshold for determining if a pixel is
                an 'edge pixel'. If the pictures contrast is lower than usual, this may
                need to be lowered.
              </p>
              <Param
                label="Hysteresis Low"
                value={options.options.hysteresisLow}
                onChange={(value) =>
                  setOptions("options", "hysteresisLow", value)
                }
              />
            </div>
            <div class="flex-col">
              <p>
                This sets the high-end threshold for determining if a pixel is
                on an edge. If the pictures contrast is higher than usual, this
                may need to be raised. Pixels above this threshold are discarded, as these trapezoids
                tend to have soft edges, while the 'noisy' pixels tend to be stronger.
              </p>
              <Param
                label="Hysteresis High"
                value={options.options.hysteresisHigh}
                onChange={(value) =>
                  setOptions("options", "hysteresisHigh", value)
                }
              />
              </div>
              <div class="flex-col">
                <p>
                  Edge pixels with fewer than this number of neighbors are discarded. Decreasing this will increase the number of edge pixels on the trapezoids, but may also increase the number of 'noisy' pixels.
                </p>
              <Param
                label="Min Neighbors for Noise Reduction"
                value={options.options.minNeighborsForNoiseReduction}
                onChange={(value) =>
                  setOptions("options", "minNeighborsForNoiseReduction", value)
                }
                />
              </div>
              <div class="flex-col">
                <p>
                  This sets how strictly the algorithm will consider a possible line to be a line. Too high, it may not find enough lines to find a trapezoid. Too low, it may get confused with all the lines.
                </p>
              <Param
                label="Hough Vote Threshold"
                value={options.options.houghVoteThreshold}
                onChange={(value) =>
                  setOptions("options", "houghVoteThreshold", value)
                }
                />
              </div>
                <div class="flex-col">
                <p>
                  This merges all lines that are within this angle of each other.
                </p>
              <Param
                label="Merge Theta Threshold"
                value={options.options.mergeThetaThreshold}
                onChange={(value) =>
                  setOptions("options", "mergeThetaThreshold", value)
                }
                />
              </div>
              <div class="flex-col">
                <p>
                  Lines that cross less than this number of edge pixels are discarded.
                </p>
              <Param
                label="Pixels Per Line Percentage Threshold"
                value={options.options.pixelThreshold}
                onChange={(value) =>
                  setOptions("options", "pixelThreshold", value)
                }
                />
              </div>
              <div class="flex-col">
                <p>
                  When looking for a trapezoid, the algorithm looks at the top X lines found in the 'bounding box'. This sets X.
                </p>
              <Param
                label="Max Lines Per Square"
                value={options.options.maxLines}
                onChange={(value) => setOptions("options", "maxLines", value)}
                />
              </div>
              <div class="flex-col">
                <p>
                  This sets the number of iterations the algorithm tries to reduce noise.
                </p>
              <Param
                label="Noise Reduction Iterations"
                value={options.options.noiseReductionIterations}
                onChange={(value) =>
                  setOptions("options", "noiseReductionIterations", value)
                }
                />
              </div>
              <div class="flex-col">
                <p>
                  Areas of the image with a density greater than this threshold are deleted. This is used to remove the 'noise' from the center of the trapezoids, which typically have a higher density than the edges of the trapezoids.
                </p>
              <Param
                label="Density Threshold"
                value={options.options.densityThreshold}
                onChange={(value) =>
                  setOptions("options", "densityThreshold", value)
                }
                />
              </div>
              <div class="flex-col">
                <p>
                  This sets how often the algorithm runs the density check.
                </p>
              <Param
                label="Density Step"
                value={options.options.densityStep}
                onChange={(value) =>
                  setOptions("options", "densityStep", value)
                }
                />
              </div>
              <div class="flex-col">
                <p>
                  This sets the size of the area the density check looks at.
                </p>
              <Param
                label="Density Size"
                value={options.options.densitySize}
                onChange={(value) =>
                  setOptions("options", "densitySize", value)
                }
              />
              </div>
            </Show>
          </div>
          <Show when={!hidden()}>
            <h2>The Gaussian Kernel is used to perform a 'Gaussian Blur' to the image. This helps reduce noise.</h2>
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
        </>
      </Show>
    </div>
  );
};

export const setupCanvas = async (
  canvas: HTMLCanvasElement,
  options: ProcessingOptions,
  src: string
): Promise<void> => {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const img = new Image();
  let imageData: ImageData;

  return new Promise((resolve) => {
    img.onload = function () {
      if (!ctx) return;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      EdgeFilter(canvas, options, imageData, ctx);
      resolve();
    };
    img.onerror = (e) => {
      console.log("IMAGE ERROR", e);
    };
    img.src = base64ToImageSrc(src);
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
  );
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
  );
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
    x + deltaX - squareSize / 2,
    y + deltaY - squareSize / 2,
    squareSize
  );
  if (!firstTest) {
    return trapezoids;
  }
  const secondTest = RecurseDirectSearchOptimization(
    getPointsOnTrapezoid,
    firstTest,
    square,
    options,
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
  squareSize?: number
): number {
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
        points++;
      }
    }
  }
  return points;
}

function RANSAC(
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
    const points = getPointsOnTrapezoid(
      edgePixels,
      convertLocalToGlobal(trapezoid, x, y),
      options,
      x,
      y,
      squareSize
    );
    if (points && (!bestFit || points > bestFit)) {
      bestTrapezoid = trapezoid;
      bestFit = points;
    }
  }
  return bestTrapezoid;
}

function getSemiRandomSample<Vertex>(size: number, width: number): Vertex[] {
  const sample: Vertex[] = [];

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

function DirectSearchOptimization(
  ft: (
    data: Uint8ClampedArray,
    trapezoid: Trapezoid,
    options: ProcessingOptions,
    x: number,
    y: number,
    squareSize?: number
  ) => number,
  trapezoid: Trapezoid,
  data: Uint8ClampedArray,
  options: ProcessingOptions,
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
  let bestFt: number = ft(data, trapezoid, options, x, y, squareSize);
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

        const newFt = ft(data, newTrapezoid, options, x, y, squareSize);
        if (bestFt === undefined || newFt > bestFt) {
          bestFt = newFt;
          bestVertex = newVertex;
        }
      }
      if (bestVertex) {
        vertices = vertices.map((v, index) =>
          index === i
            ? (bestVertex as Vertex)
            : { x: Math.round(v.x), y: Math.round(v.y) }
        );
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
    squareSize?: number
  ) => number,
  trapezoid: Trapezoid,
  data: Uint8ClampedArray,
  options: ProcessingOptions,
  x: number,
  y: number,
  squareSize: number
) {
  let vertices = [
    { x: trapezoid.top.x1, y: trapezoid.top.y1 },
    { x: trapezoid.top.x2, y: trapezoid.top.y2 },
    { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 },
    { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 },
  ];
  let bestFt: number = ft(data, trapezoid, options, x, y, squareSize);
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
            x:
              Math.round(
                (v.x - x) * Math.cos(angle) - (v.y - y) * Math.sin(angle)
              ) + x,
            y:
              Math.round(
                (v.x - x) * Math.sin(angle) + (v.y - y) * Math.cos(angle)
              ) + y,
          }));
          const rotatedT: Trapezoid = computeTrapezoid(rotatedVertices);
          const newFt = ft(data, rotatedT, options, x, y, squareSize);
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
    squareSize?: number
  ) => number,
  trapezoid: Trapezoid,
  data: Uint8ClampedArray,
  options: ProcessingOptions,
  x: number,
  y: number,
  squareSize: number,
  fit: number
) {
  // Move each vertex in trapezoid by 5 pixels in 16 directions, take the best one
  let vertices = [
    { x: trapezoid.top.x1, y: trapezoid.top.y1 },
    { x: trapezoid.top.x2, y: trapezoid.top.y2 },
    { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 },
    { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 },
  ];
  let bestFt: number = ft(data, trapezoid, options, x, y, squareSize);
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
        const newFt = ft(data, newTrapezoid, options, x, y, squareSize);
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
  if (bestFt < fit * options.minimumFit) return null;
  return computeTrapezoid(vertices);
}

function computeTrapezoid(
  vertices: Vertex[],
): Trapezoid {
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
  if (topRight.x < topLeft.x) {
    const temp = topRight;
    topRight = topLeft;
    topLeft = temp;
  }
  if (topLeft.y > bottomLeft.y) {
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
