import type {
  FinalSliceConfiguration,
  SliceConfiguration,
  Trapezoid,
  TrapezoidSet,
  Vertex,
  ZoomState,
} from "@dto/canvas";
import {
  convertLocalToGlobal,
  convertZoomedCoordinatesToFullImage,
  DirectSearchOptimization,
  DrawTrapezoid,
  findConnectedTrapezoids,
  getPointsOnTrapezoid,
  getSquare,
  lerp,
  RANSAC,
  setupCanvas,
} from "@logic/canvas";
import { base64ToImageSrc } from "@logic/image";
import {
  computeStageCoordinates,
  StageConfiguration,
} from "@logic/semCoordinates";
import { getIndicesOfSlicesToConfigure } from "@logic/sliceConfiguration";
import { detectTrapezoid } from "@logic/trapezoids/detection";
import { filterTrapezoids } from "@logic/trapezoids/filter";
import { findNearestPoint, isPointInTrapezoid } from "@logic/trapezoids/points";
import { trapezoidIsValid } from "@logic/trapezoids/valid";
import { findNearestVertex, moveVertex } from "@logic/trapezoids/vertices";
import {
  createEffect,
  createSignal,
  For,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
  untrack,
} from "solid-js";
import { createOptionsStore } from "src/data/createOptionsStore";
import { handleFinalImaging } from "src/data/handleFinalImaging";
import { DEFAULT_MAG } from "src/data/magnification";
import { getSEMParam } from "src/data/semParams";
import { getNextCommandId } from "src/data/signals/commandQueue";
import { Button } from "./Button";
import { ConfigureSliceCanvas } from "./ConfigureSliceCanvas";
import { GrabForm } from "./GrabForm";
import { KernelParam } from "./KernelParam";
import { Param } from "./Param";
import { SliderPicker } from "./SliderPicker";
import { availableColors, TrapezoidSetConfig } from "./TrapezoidSetConfig";

const DEFAULT_ZOOM_SCALE = 10;

export const Canvas = () => {
  const [imageSrc, setImageSrc] = createSignal<string | null>(null);
  const [highResImageSrc, setHighResImageSrc] = createSignal<string | null>(
    null
  );

  let canvasRef!: HTMLCanvasElement;
  let overlayCanvasRef!: HTMLCanvasElement;
  const [hidden, setHidden] = createSignal(true);
  const [refresh, setRefresh] = createSignal(0);
  const [nextId, setNextId] = createSignal(1);

  const [points, setPoints] = createSignal<[number, number][]>([]);
  const [edgeData, setEdgeData] = createSignal<ImageData>();
  const [clickedPoint, setClickedPoint] = createSignal<Vertex>();
  const [showOriginalImage, setShowOriginalImage] = createSignal(true);
  const [ribbons, setRibbons] = createSignal<TrapezoidSet[]>([]);
  const [focusedRibbon, setFocusedRibbon] = createSignal<
    TrapezoidSet["id"] | null
  >(null);
  const [focusedSlice, setFocusedSlice] = createSignal<number>(-1);
  const [sliceConfiguration, setSliceConfiguration] = createSignal<
    SliceConfiguration[]
  >([]);
  const [magnification, setMagnification] = createSignal(DEFAULT_MAG);
  const [zoomState, setZoomState] = createSignal<
    ZoomState | "pickingCenter" | null
  >(null);
  const [grabbing, setGrabbing] = createSignal(false);
  const [percentComplete, setPercentComplete] = createSignal(0);
  const [initialStage, setInitialStage] =
    createSignal<StageConfiguration | null>(null);

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === "z") handleZoomButtonPressed();
  };

  const handleZoomButtonPressed = () => {
    if (zoomState()) setZoomState(null);
    else setZoomState("pickingCenter");
  };

  createEffect(() => {
    // re-draw the overlay canvas when the ribbons or zoom change
    ribbons();
    zoomState();
    drawOverlay();
  });

  createEffect(() => {
    // re-draw the image canvas when it's toggled or zoom changes
    showOriginalImage();
    zoomState();
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
      fit = getPointsOnTrapezoid(
        square,
        trapezoid,
        options.options,
        imgX - options.options.squareSize / 2,
        imgY - options.options.squareSize / 2
      );
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
    ribbons().forEach((set) => colors.delete(set.color));
    const color = colors.size > 0 ? colors.values().next().value : "red";
    const filteredTrapezoids = filterTrapezoids(connectedTrapezoids, ribbons());
    const orderedTrapezoids = orderTrapezoids([
      ...filteredTrapezoids,
      trapezoid,
    ]);
    const id = nextId();
    setRibbons((prev) => [
      ...prev,
      {
        trapezoids: orderedTrapezoids,
        id,
        name: `Ribbon ${id}`,
        color,
        thickness: 5,
        status: "editing",
        matchedPoints: [],
        reversed: false,
      } as TrapezoidSet,
    ]);
    setNextId((prev) => prev + 1);
    if (toggleOriginalImage) {
      setShowOriginalImage(true);
    }
  };

  const orderTrapezoids = (trapezoids: Trapezoid[]) => {
    // order with the top trapezoid being 1
    return trapezoids.sort((a, b) => {
      const aTop = Math.min(a.top.y1, a.top.y2);
      const bTop = Math.min(b.top.y1, b.top.y2);
      return aTop - bTop;
    });
  };

  createEffect(async () => {
    refresh();
    const src = imageSrc();
    if (!src) return;
    const o = options.options;
    await setupCanvas(canvasRef, o, src, overlayCanvasRef);
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

  onMount(async () => {
    overlayCanvasRef.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleKeyPress);
    setOriginalImage();

    const stageX = await getSEMParam("AP_STAGE_AT_X");
    const stageY = await getSEMParam("AP_STAGE_AT_Y");
    const stageLowLimitX = await getSEMParam("AP_STAGE_LOW_X");
    const stageLowLimitY = await getSEMParam("AP_STAGE_LOW_Y");
    const stageHighLimitX = await getSEMParam("AP_STAGE_HIGH_X");
    const stageHighLimitY = await getSEMParam("AP_STAGE_HIGH_Y");
    const fieldOfViewWidth = await getSEMParam("AP_WIDTH");
    const fieldOfViewHeight = await getSEMParam("AP_HEIGHT");
    setInitialStage({
      x: parseFloat(stageX),
      y: parseFloat(stageY),
      width: parseFloat(fieldOfViewWidth),
      height: parseFloat(fieldOfViewHeight),
      limits: {
        x: [parseFloat(stageLowLimitX), parseFloat(stageHighLimitX)],
        y: [parseFloat(stageLowLimitY), parseFloat(stageHighLimitY)],
      },
    });
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyPress);
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
    };
    img.src = base64ToImageSrc(src);
    const o = options.options;
    await setupCanvas(canvasRef, o, src, overlayCanvasRef);
  }

  const drawOverlay = () => {
    const ctx = overlayCanvasRef.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    ctx.save();

    const zoom = zoomState();
    if (zoom && zoom !== "pickingCenter") {
      const { x, y, scale } = zoom;
      ctx.translate(canvasRef.width / 2, canvasRef.height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-x, -y);
    }

    for (const trapezoidSet of ribbons()) {
      const { trapezoids, color, thickness } = trapezoidSet;
      for (let i = 0; i < trapezoids.length; i++) {
        // render the first trapezoid distinctly
        const isFirstTrapezoid = i === 0;
        ctx.globalAlpha = isFirstTrapezoid ? 1 : 0.7;
        DrawTrapezoid(
          trapezoids[i],
          ctx,
          color,
          thickness * (isFirstTrapezoid ? 1.5 : 0.9)
        );
      }
      ctx.globalAlpha = 1;
      for (const point of trapezoidSet.matchedPoints) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, thickness - 1, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  function draw() {
    const ctx = canvasRef.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    const showEdgeData = !showOriginalImage() && edgeData() && !zoomState();

    if (showEdgeData) {
      ctx.putImageData(edgeData()!, 0, 0);
      ctx.restore();
    } else {
      const src = highResImageSrc();
      if (!src) return;
      const img = new Image();
      img.onload = () => {
        ctx.canvas.width = img.width;
        ctx.canvas.height = img.height;
        const zoom =
          !zoomState() || zoomState() === "pickingCenter"
            ? null
            : (zoomState() as ZoomState);
        if (zoom) {
          const { x, y, scale } = zoom;
          const viewportWidth = canvasRef.width / scale;
          const viewportHeight = canvasRef.height / scale;
          const viewportX = x - viewportWidth / 2;
          const viewportY = y - viewportHeight / 2;
          ctx.drawImage(
            img,
            viewportX,
            viewportY,
            viewportWidth,
            viewportHeight,
            0,
            0,
            canvasRef.width,
            canvasRef.height
          );
        } else {
          ctx.drawImage(img, 0, 0);
        }
      };
      img.src = base64ToImageSrc(src);
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvasRef.getBoundingClientRect();
    const rectWidth = rect.right - rect.left;
    const rectHeight = rect.bottom - rect.top;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imgX1 = Math.round((x / rectWidth) * canvasRef.width);
    const imgY1 = Math.round((y / rectHeight) * canvasRef.height);

    if (zoomState() === "pickingCenter") {
      setZoomState({
        x: imgX1,
        y: imgY1,
        scale: DEFAULT_ZOOM_SCALE,
      });
      return;
    }

    const { x: imgX, y: imgY } = convertZoomedCoordinatesToFullImage(
      imgX1,
      imgY1,
      zoomState() as ZoomState | null,
      canvasRef.width,
      canvasRef.height
    );

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
      ribbons()
        .map((t) => t.trapezoids)
        .flat()
    );
    if (inTrapezoid && trapezoid) {
      const { trapezoidSet } = findTrapezoidSet(trapezoid);
      if (trapezoidSet && trapezoidSet.status === "matching") {
        pointMatching(imgX, imgY, trapezoidSet);
        return;
      }
    }
    const { nearestDistance } = findNearestVertex(
      imgX,
      imgY,
      ribbons()
        .map((t) => t.trapezoids)
        .flat()
    );
    if (nearestDistance < 15 || inTrapezoid) {
      setClickedPoint({ x: imgX, y: imgY });
      overlayCanvasRef.addEventListener("mousemove", handleMouseMove);
      overlayCanvasRef.addEventListener("mouseup", handleMouseUp);
      e.preventDefault();
    } else {
      handleClick(e);
    }
  }

  function findTrapezoidSet(trapezoid: Trapezoid) {
    for (const trapezoidSet of ribbons()) {
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
        overlayCanvasRef.addEventListener("mousemove", handleMouseMove);
        overlayCanvasRef.addEventListener("mouseup", handleMouseUp);
        setClickedPoint(nearestPoint);
        return;
      } else {
        setRibbons(
          ribbons().map((t) => {
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
    // const ctx = canvasRef.getContext("2d")!;
    const { trapezoid, inTrapezoid } = isPointInTrapezoid(x, y, trapezoids);
    if (!inTrapezoid || !trapezoid) return;
    // ctx.beginPath();
    // ctx.arc(x, y, 5, 0, 2 * Math.PI);
    // ctx.fillStyle = trapezoidSet.color;
    // ctx.closePath();
    // ctx.fill();
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
    } else {
      angle1 = Math.atan(
        (trapezoid.top.y2 - trapezoid.top.y1) /
          (trapezoid.top.x2 - trapezoid.top.x1)
      );
    }

    const dx = x - center.x;
    const dy = y - center.y;

    const points: Vertex[] = [];
    points.push({
      x,
      y,
    });
    for (const otherTrapezoid of trapezoids) {
      if (otherTrapezoid === trapezoid) continue;
      let angle2 = 0;
      // angle2 of the top line
      if (otherTrapezoid.top.x1 === otherTrapezoid.top.x2) {
        angle2 = Math.PI / 2;
      } else {
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
      const otherDx = dx * Math.cos(angle) - dy * Math.sin(angle);
      const otherDy = dx * Math.sin(angle) + dy * Math.cos(angle);
      const otherX = otherCenter.x + otherDx;
      const otherY = otherCenter.y + otherDy;
      points.push({
        x: otherX,
        y: otherY,
      });
    }
    setRibbons(
      ribbons().map((t) => {
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

  function handleMouseMove(e: MouseEvent) {
    // calculate the new cursor position:
    const rect = canvasRef.getBoundingClientRect();
    const rectWidth = rect.right - rect.left;
    const rectHeight = rect.bottom - rect.top;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imgX1 = Math.round((x / rectWidth) * canvasRef.width);
    const imgY1 = Math.round((y / rectHeight) * canvasRef.height);

    const zoom =
      zoomState() && zoomState() !== "pickingCenter"
        ? (zoomState() as ZoomState)
        : null;
    const { x: imgX, y: imgY } = convertZoomedCoordinatesToFullImage(
      imgX1,
      imgY1,
      zoom,
      canvasRef.width,
      canvasRef.height
    );

    // are they dragging a point?
    const { inTrapezoid, trapezoid } = isPointInTrapezoid(
      imgX,
      imgY,
      ribbons()
        .map((t) => t.trapezoids)
        .flat()
    );
    const { nearestVertex, nearestDistance } = findNearestVertex(
      imgX,
      imgY,
      ribbons()
        .map((t) => t.trapezoids)
        .flat()
    );
    if (inTrapezoid && trapezoid) {
      const { trapezoidSet } = findTrapezoidSet(trapezoid);
      if (trapezoidSet?.status === "saved") return;
      if (trapezoidSet && trapezoidSet.status === "matching") {
        const { nearestPoint, nearestDistance: pointDistance } =
          findNearestPoint(imgX, imgY, trapezoidSet.matchedPoints);
        if (nearestPoint && pointDistance < 10) {
          const newMatchedPoints = trapezoidSet.matchedPoints.map((point) => {
            if (point.x === nearestPoint.x && point.y === nearestPoint.y) {
              return { x: imgX, y: imgY };
            }
            return point;
          });
          setRibbons(
            ribbons().map((t) => {
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
          setRibbons(
            ribbons().map((t) =>
              t.trapezoids === trapezoidSet.trapezoids
                ? { ...t, trapezoids: newTrapezoids, matchedPoints: [] }
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
        setRibbons(
          ribbons().map((t) =>
            t.trapezoids === trapezoidSet.trapezoids
              ? { ...t, trapezoids: newTrapezoids, matchedPoints: [] }
              : t
          )
        );
        return;
      }
    }
    // Dragging a vertex
    if (nearestDistance < 3) return;
    if (nearestVertex && nearestDistance < 15) {
      const trapezoid = ribbons()
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
      if (trapezoidSet?.status === "saved") return;
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
      const newTrapezoids = ribbons().map((t) =>
        t.trapezoids === trapezoidSet?.trapezoids
          ? { ...t, trapezoids: newSet, matchedPoints: [] }
          : t
      );
      setRibbons(newTrapezoids); //TODO double check
    }
    refresh();
  }

  function handleMouseUp() {
    overlayCanvasRef.removeEventListener("mousemove", handleMouseMove);
    overlayCanvasRef.removeEventListener("mouseup", handleMouseUp);

    setClickedPoint(undefined);
  }

  const handleStartGrabbing = async () => {
    setFocusedSlice(-1);
    setGrabbing(true);
    const userConfigurations = sliceConfiguration();
    const ribbon = ribbons().find((r) => r.id === focusedRibbon());
    const stage = initialStage();
    if (!ribbon || !stage) return;
    const interpolatedConfigurations: SliceConfiguration[] = [];
    for (let i = 0; i < userConfigurations.length; i++) {
      const configA = userConfigurations[i];
      interpolatedConfigurations.push(configA);
      if (i === userConfigurations.length - 1) break;
      const configB = userConfigurations[i + 1];
      for (let j = configA.index + 1; j < configB.index; j++) {
        const percent = (j - configA.index) / (configB.index - configA.index);
        const brightness = lerp(
          configA.brightness || 0,
          configB.brightness || 0,
          percent
        );
        const contrast = lerp(
          configA.contrast || 0,
          configB.contrast || 0,
          percent
        );
        const focus = lerp(configA.focus || 0, configB.focus || 0, percent);
        interpolatedConfigurations.push({
          index: j,
          brightness,
          contrast,
          focus,
        });
      }
    }
    const ribbonId = getNextCommandId();
    const ribbonName = ribbon.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const finalConfigurations: FinalSliceConfiguration[] =
      interpolatedConfigurations.map((c) => {
        const point = computeStageCoordinates({
          point: ribbon.matchedPoints[c.index],
          canvasConfiguration: canvasRef,
          stageConfiguration: stage,
        });
        return {
          magnification: magnification(),
          brightness: c.brightness!,
          contrast: c.contrast!,
          focus: c.focus!,
          label: `slice-${c.index + 1}`,
          point,
          ribbonId,
          ribbonName,
        };
      });
    console.log(finalConfigurations);
    await handleFinalImaging(finalConfigurations, setPercentComplete);
    setGrabbing(false);
    setFocusedRibbon(-1);
    alert(`Done imaging for ${ribbon.name}!`);
  };

  const handleMoveStageToSlice = () => {
    const ribbon = ribbons().find((ribbon) => ribbon.id === focusedRibbon())!;
    const point = ribbon.matchedPoints[focusedSlice()];
    const coordinates = computeStageCoordinates({
      point,
      canvasConfiguration: canvasRef,
      stageConfiguration: initialStage()!,
    });
    window.semClient.send({
      type: "setParam",
      id: getNextCommandId(),
      param: "AP_STAGE_GOTO_X",
      value: coordinates.x,
    });
    window.semClient.send({
      type: "setParam",
      id: getNextCommandId(),
      param: "AP_STAGE_GOTO_Y",
      value: coordinates.y,
    });
  };

  return (
    <div class="flex flex-col gap-3 text-xs">
      <Show
        when={grabbing()}
        fallback={
          <Show when={focusedSlice() !== -1 && initialStage()}>
            <ConfigureSliceCanvas
              stage={initialStage()!}
              magnification={magnification()}
              setMagnification={setMagnification}
              canvas={canvasRef}
              configuration={
                sliceConfiguration().find(
                  ({ index }) => index === focusedSlice()
                )!
              }
              setConfiguration={(newConfiguration) => {
                if (newConfiguration.brightness) {
                  window.semClient.send({
                    id: getNextCommandId(),
                    type: "setParam",
                    param: "AP_BRIGHTNESS",
                    value: newConfiguration.brightness,
                  });
                }
                if (newConfiguration.contrast) {
                  window.semClient.send({
                    id: getNextCommandId(),
                    type: "setParam",
                    param: "AP_CONTRAST",
                    value: newConfiguration.contrast,
                  });
                }
                if (newConfiguration.focus) {
                  window.semClient.send({
                    id: getNextCommandId(),
                    type: "setParam",
                    param: "AP_WD",
                    value: newConfiguration.focus,
                  });
                }
                setSliceConfiguration(
                  sliceConfiguration().map((c) =>
                    c.index === focusedSlice()
                      ? { ...c, ...newConfiguration }
                      : c
                  )
                );
              }}
              onNext={() => {
                const currentConfigIndex = sliceConfiguration().findIndex(
                  (c) => c.index === focusedSlice()
                );
                if (currentConfigIndex === sliceConfiguration().length - 1) {
                  handleStartGrabbing();
                } else {
                  setFocusedSlice(
                    sliceConfiguration()[currentConfigIndex + 1].index
                  );
                  handleMoveStageToSlice();
                }
              }}
              onPrevious={() => {
                const currentConfigIndex = sliceConfiguration().findIndex(
                  (c) => c.index === focusedSlice()
                );
                if (currentConfigIndex === 0) {
                  return;
                } else {
                  setFocusedSlice(
                    sliceConfiguration()[currentConfigIndex - 1].index
                  );
                  handleMoveStageToSlice();
                }
              }}
              ribbon={
                ribbons().find((ribbon) => ribbon.id === focusedRibbon())!
              }
            />
          </Show>
        }
      >
        <h2 class="text-xl font-bold">
          Grabbing... {percentComplete()}% complete
        </h2>
      </Show>
      <Show when={focusedSlice() === -1}>
        <Show when={imageSrc()}>
          <div class="grid grid-cols-4 gap-4 mt-1">
            <Button
              onClick={() => {
                setImageSrc(null);
                setPoints([]);
                setRibbons([]);
                setRefresh(refresh() + 1);
                setZoomState(null);
              }}
            >
              Clear Image
            </Button>
            <div class="w-full flex flex-col">
              <Show when={ribbons().length > 0}>
                <Button
                  onClick={() => {
                    setPoints([]);
                    setRibbons([]);
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
            <Button onClick={handleZoomButtonPressed}>
              <Switch fallback="Zoom in">
                <Match when={zoomState() === "pickingCenter"}>
                  Click on image to zoom
                </Match>
                <Match when={zoomState()}>Zoom Out</Match>
              </Switch>
            </Button>
          </div>
        </Show>
        <For each={ribbons()}>
          {(trapezoidSet) => (
            <TrapezoidSetConfig
              grabbing={focusedRibbon() === trapezoidSet.id}
              onGrab={(id) => {
                setFocusedRibbon(id);
                const trapezoids = ribbons().find(
                  (t) => t.id === id
                )!.trapezoids;
                const indicesToConfigure = getIndicesOfSlicesToConfigure(
                  trapezoids.length
                );
                setSliceConfiguration(
                  trapezoids
                    .map((_, index) => ({ index } as SliceConfiguration))
                    .filter((_, index) => indicesToConfigure.includes(index))
                );
                setFocusedSlice(indicesToConfigure[0]);
              }}
              canvasSize={canvasRef}
              trapezoidSet={trapezoidSet}
              setTrapezoidSet={(newTrapezoidSet) => {
                const newTrapezoidSets = ribbons().map((t) =>
                  t.id === newTrapezoidSet.id ? { ...t, ...newTrapezoidSet } : t
                );
                setRibbons(newTrapezoidSets);
              }}
              onDelete={({ id }) =>
                setRibbons(ribbons().filter((t) => t.id !== id))
              }
            />
          )}
        </For>
        <Show when={zoomState() && zoomState() !== "pickingCenter"}>
          <SliderPicker
            label="Zoom"
            value={(zoomState() as ZoomState).scale}
            setValue={(scale) => {
              setZoomState({ ...(zoomState() as ZoomState), scale });
            }}
            unit="x"
            max={15}
            min={1}
          />
        </Show>
      </Show>
      <div
        class="relative"
        classList={{
          hidden: focusedSlice() !== -1 || grabbing(),
        }}
      >
        <canvas
          ref={canvasRef}
          id="canvas"
          width="1000"
          height="1000"
          class="w-[clamp(300px,_100%,_85vh)] mx-auto"
          classList={{
            hidden: !imageSrc(),
          }}
        ></canvas>
        <canvas
          ref={overlayCanvasRef}
          id="canvas"
          width="1000"
          height="1000"
          class="w-[clamp(300px,_100%,_85vh)] mx-auto absolute top-0 left-[50%] translate-x-[-50%] z-50"
          classList={{
            hidden: !imageSrc(),
            "cursor-zoom-in": zoomState() === "pickingCenter",
            "cursor-crosshair": zoomState() !== "pickingCenter",
          }}
        ></canvas>
        <Show
          when={imageSrc()}
          fallback={
            <GrabForm
              onGrabbed={(src, slowSrc) => {
                setImageSrc(src);
                setHighResImageSrc(slowSrc);
              }}
            />
          }
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
                  This sets the size of a 'bounding box' where the algorithm
                  will look for a trapezoid. This may need to be changed if the
                  image is more or less zoomed in than usual.
                </p>
                <Param
                  label="Square Size"
                  value={options.options.squareSize}
                  onChange={(value) =>
                    setOptions("options", "squareSize", value)
                  }
                />
              </div>
              <div class="flex=col">
                <p>
                  This sets the minimum fit relative to the first fit for a
                  trapezoid to be valid. If this is too high, the algorithm will
                  fail to find a trapezoid where there are few edge pixels. Too
                  low, and trapezoids will be found past the line of trapezoids.
                </p>
                <Param
                  label="Minimum Fit for Recurrence"
                  value={options.options.minimumFit}
                  onChange={(value) =>
                    setOptions("options", "minimumFit", value)
                  }
                />
              </div>
              <div class="flex-col">
                <p>
                  This sets the minimum fit for the first trapezoid, if this
                  fails a secondary algorithm will be used to find a trapezoid.
                  This may not need to be changed.
                </p>
                <Param
                  label="Minimum Fit for First"
                  value={options.options.firstFit}
                  onChange={(value) => setOptions("options", "firstFit", value)}
                />
              </div>
              <Show when={!hidden()}>
                <div class="flex=col">
                  <p>
                    This sets the low-end threshold for determining if a pixel
                    is an 'edge pixel'. If the pictures contrast is lower than
                    usual, this may need to be lowered.
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
                    This sets the high-end threshold for determining if a pixel
                    is on an edge. If the pictures contrast is higher than
                    usual, this may need to be raised. Pixels above this
                    threshold are discarded, as these trapezoids tend to have
                    soft edges, while the 'noisy' pixels tend to be stronger.
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
                    Edge pixels with fewer than this number of neighbors are
                    discarded. Decreasing this will increase the number of edge
                    pixels on the trapezoids, but may also increase the number
                    of 'noisy' pixels.
                  </p>
                  <Param
                    label="Min Neighbors for Noise Reduction"
                    value={options.options.minNeighborsForNoiseReduction}
                    onChange={(value) =>
                      setOptions(
                        "options",
                        "minNeighborsForNoiseReduction",
                        value
                      )
                    }
                  />
                </div>
                <div class="flex-col">
                  <p>
                    This sets how strictly the algorithm will consider a
                    possible line to be a line. Too high, it may not find enough
                    lines to find a trapezoid. Too low, it may get confused with
                    all the lines.
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
                    This merges all lines that are within this angle of each
                    other.
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
                    Lines that cross less than this number of edge pixels are
                    discarded.
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
                    When looking for a trapezoid, the algorithm looks at the top
                    X lines found in the 'bounding box'. This sets X.
                  </p>
                  <Param
                    label="Max Lines Per Square"
                    value={options.options.maxLines}
                    onChange={(value) =>
                      setOptions("options", "maxLines", value)
                    }
                  />
                </div>
                <div class="flex-col">
                  <p>
                    This sets the number of iterations the algorithm tries to
                    reduce noise.
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
                    Areas of the image with a density greater than this
                    threshold are deleted. This is used to remove the 'noise'
                    from the center of the trapezoids, which typically have a
                    higher density than the edges of the trapezoids.
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
              <h2>
                The Gaussian Kernel is used to perform a 'Gaussian Blur' to the
                image. This helps reduce noise.
              </h2>
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
    </div>
  );
};
