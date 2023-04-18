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
import { GrabForm } from "./GrabForm";
import { KernelParam } from "./KernelParam";
import { Param } from "./Param";
import { availableColors, TrapezoidSet, TrapezoidSetConfig } from "./TrapezoidSetConfig";
import type { Trapezoid, Vertex, Status } from "@dto/canvas";
import { calculateArea, convertLocalToGlobal, DirectSearchOptimization, DrawTrapezoid, findConnectedTrapezoids, getPointsOnTrapezoid, getSquare, RANSAC, setupCanvas } from "@logic/canvas";

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
        status: 'editing',
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
      if (trapezoidSet && trapezoidSet.status === 'matching') {
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
      if (trapezoidSet?.status === 'saved') return;
      if (trapezoidSet && trapezoidSet.status === 'matching') {
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
      if (trapezoidSet?.status === 'saved') return;
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
        class='w-[clamp(300px,_100%,_1400px)] mx-auto'
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
