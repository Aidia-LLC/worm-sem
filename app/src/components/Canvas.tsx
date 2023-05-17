import {
  convertZoomedCoordinatesToFullImage,
  DirectSearchOptimization,
  DrawTrapezoid,
  findConnectedTrapezoids,
  getPointsOnTrapezoid,
  getSquare,
  lerp,
  permuteTrapezoid,
  RANSAC,
  setupCanvas,
  translateTrapezoid,
} from "@logic/canvas";
import { edgeFilter } from "@logic/edgeFilter";
import { handleFinalImaging } from "@logic/handleFinalImaging";
import { base64ToImageSrc } from "@logic/image";
import { segmentImage } from "@logic/segmentation";
import {
  computeStageCoordinates,
  StageConfiguration,
} from "@logic/semCoordinates";
import { getIndicesOfSlicesToConfigure } from "@logic/sliceConfiguration";
import { orderTrapezoids } from "@logic/trapezoids/connected";
import { detectTrapezoid } from "@logic/trapezoids/detection";
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
} from "solid-js";
import { createOptionsStore } from "src/data/createOptionsStore";
import { DEFAULT_MAG } from "src/data/magnification";
import { getSEMParam } from "src/data/semParams";
import { getNextCommandId } from "src/data/signals/commandQueue";
import type {
  FinalSliceConfiguration,
  RibbonData,
  SliceConfiguration,
  Trapezoid,
  Vertex,
  ZoomState,
} from "src/types/canvas";
import { Button } from "./Button";
import { ConfigureSliceCanvas } from "./ConfigureSliceCanvas";
import { GrabForm } from "./GrabForm";
import { Param } from "./Param";
import { availableColors, RibbonConfig } from "./RibbonConfig";
import { SliderPicker } from "./SliderPicker";

const DEFAULT_ZOOM_SCALE = 10;

export const Canvas = (props: { samLoaded: boolean }) => {
  let canvasRef!: HTMLCanvasElement;
  let overlayCanvasRef!: HTMLCanvasElement;
  let edgeDataCanvasRef!: HTMLCanvasElement;

  const [imageSrc, setImageSrc] = createSignal<string | null>(null);
  const [imageSrcFilename, setImageSrcFilename] = createSignal<string | null>(
    null
  );
  const [paramsHidden, setParamsHidden] = createSignal(true);
  const [nextId, setNextId] = createSignal(1);
  const [optionsSequence, setOptionsSequence] = createSignal(0);
  const [detection, setDetection] = createSignal(true);
  const [clickedPoint, setClickedPoint] = createSignal<Vertex>();
  const [showOriginalImage, setShowOriginalImage] = createSignal(true);
  const [ribbons, setRibbons] = createSignal<RibbonData[]>([]);
  const [focusedRibbon, setFocusedRibbon] = createSignal<
    RibbonData["id"] | null
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
  const [cursorPosition, setCursorPosition] = createSignal<[number, number]>([
    0, 0,
  ]);
  const [clickedPoints, setClickedPoints] = createSignal<[number, number][]>(
    []
  );
  const [detectionLoading, setDetectionLoading] = createSignal(false);
  const [masks, setMasks] = createSignal<ImageData[]>([]);
  const [options, setOptions, resetOptions] = createOptionsStore();
  const [VERTEX_DIST, setVertexDist] = createSignal(
    options.options.squareSize / 5
  );

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === "z") handleZoomButtonPressed();
  };

  const handleZoomButtonPressed = () => {
    if (zoomState()) setZoomState(null);
    else setZoomState("pickingCenter");
  };

  createEffect(() => {
    const [mask] = masks();
    if (!mask) return;
    const ctx = edgeDataCanvasRef.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(mask, 0, 0);
  });

  createEffect(() => {
    // re-draw the overlay canvas when the ribbons, cursor, detection state, or zoom change
    ribbons();
    zoomState();
    cursorPosition();
    detection();
    drawOverlay();
  });

  createEffect(() => {
    // re-draw the image canvas when zoom changes
    const src = imageSrc();
    if (!src) return;
    zoomState();
    draw();
  });

  createEffect(() => {
    optionsSequence();
    setVertexDist(options.options.squareSize / 5);
  });

  const handleClick = async (e: MouseEvent) => {
    if (!detection()) return;
    const rect = canvasRef.getBoundingClientRect();
    const rectWidth = rect.right - rect.left;
    const rectHeight = rect.bottom - rect.top;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imgX = Math.round((x / rectWidth) * canvasRef.width);
    const imgY = Math.round((y / rectHeight) * canvasRef.height);

    setClickedPoints((prev) => [...prev, [imgX, imgY]]);
    console.log(clickedPoints());
  };

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
    const currentMag = await getSEMParam("AP_MAG");
    setMagnification(parseFloat(currentMag));
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
    console.log(initialStage());
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
    await setupCanvas(canvasRef, src, overlayCanvasRef);
  }

  const drawOverlay = () => {
    const ctx = overlayCanvasRef.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    ctx.save();

    const zoom = zoomState();
    const scale = zoom && zoom !== "pickingCenter" ? zoom.scale : 1;
    if (zoom && zoom !== "pickingCenter") {
      const { x, y, scale } = zoom;
      ctx.translate(canvasRef.width / 2, canvasRef.height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-x, -y);
    }

    if (detection()) {
      const [x, y] = cursorPosition();
      const halfSquare = options.options.squareSize / 2;
      if (x && y) {
        ctx.beginPath();
        ctx.rect(
          x - halfSquare,
          y - halfSquare,
          options.options.squareSize,
          options.options.squareSize
        );
        ctx.strokeStyle = "red";
        ctx.lineWidth = 15;
        ctx.closePath();
        ctx.stroke();
      }

      for (const point of clickedPoints()) {
        ctx.beginPath();
        ctx.arc(point[0], point[1], 10, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
        ctx.closePath();

        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.rect(
          point[0] - halfSquare,
          point[1] - halfSquare,
          options.options.squareSize,
          options.options.squareSize
        );
        ctx.strokeStyle = "red";
        ctx.lineWidth = 15;
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
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
        ctx.fillStyle = "white";
        ctx.font = `${Math.ceil(thickness * 9)}px Arial`;
        ctx.fillText(`${i + 1}`, trapezoids[i].left.x1, trapezoids[i].left.y1);
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 9 / scale;
      const radius = (3 / scale) * 4;
      for (const point of trapezoidSet.matchedPoints) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  function draw() {
    const ctx = canvasRef.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    const src = imageSrc();
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      ctx.canvas.width = img.width;
      ctx.canvas.height = img.height;
      overlayCanvasRef.width = img.width;
      overlayCanvasRef.height = img.height;
      edgeDataCanvasRef.width = img.width;
      edgeDataCanvasRef.height = img.height;
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
    if (nearestDistance < VERTEX_DIST() || inTrapezoid) {
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

  function pointMatching(x: number, y: number, trapezoidSet: RibbonData) {
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
    const { trapezoid, inTrapezoid } = isPointInTrapezoid(x, y, trapezoids);
    if (!inTrapezoid || !trapezoid) return;
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
      else if (
        nearestVertex &&
        nearestDistance > VERTEX_DIST() &&
        trapezoidSet
      ) {
        const dy = imgY - clickedPoint()!.y ?? 0;
        const dx = imgX - clickedPoint()!.x ?? 0;
        setClickedPoint({ x: imgX, y: imgY });
        const newTrapezoid = translateTrapezoid(trapezoid, dx, dy);
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
    console.log('final config');
    console.log(finalConfigurations);
    try {
      await handleFinalImaging(finalConfigurations, setPercentComplete);
      alert(`Done imaging for ${ribbon.name}!`);
    } catch (err) {
      console.error(err);
      alert(`Error imaging ${ribbon.name}. ${(err as Error).message}`);
    }
    setGrabbing(false);
    setFocusedRibbon(-1);
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
      doubleValue: coordinates.x,
    });
    window.semClient.send({
      type: "setParam",
      id: getNextCommandId(),
      param: "AP_STAGE_GOTO_Y",
      doubleValue: coordinates.y,
    });
  };

  const handleRibbonDetection = ([[imgX, imgY], ...points]: [
    number,
    number
  ][]) => {
    const edgeContext = edgeDataCanvasRef.getContext("2d")!;
    const edgeData = edgeContext.getImageData(
      0,
      0,
      edgeDataCanvasRef.width,
      edgeDataCanvasRef.height
    );
    let { trapezoid, fit } = detectTrapezoid(
      imgX,
      imgY,
      edgeData,
      // canvasRef.getContext("2d")!,
      options.options
    );
    console.log("trapezoid", trapezoid);
    const valid =
      trapezoid &&
      trapezoidIsValid(trapezoid, imgX, imgY, options.options, fit);
    console.log("valid", valid);
    if (!valid) {
      const square = getSquare(
        edgeData,
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
      console.log("trapezoid ransac", trapezoid);
      if (!trapezoid) return;
      trapezoid = translateTrapezoid(
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
    trapezoid = permuteTrapezoid(trapezoid);
    const id = nextId();
    setNextId((prev) => prev + 1);
    setDetection(false);
    const colors = new Set(availableColors);
    ribbons().forEach((set) => colors.delete(set.color));
    const color = colors.size > 0 ? colors.values().next().value : "red";
    const connectedTrapezoids = findConnectedTrapezoids(
      trapezoid,
      edgeContext,
      imgX,
      imgY,
      options.options,
      options.options.minimumFit
    );
    const trapezoids = orderTrapezoids(
      [trapezoid, ...connectedTrapezoids].filter((t) => {
        const x = [
          t.bottom.x1,
          t.bottom.x2,
          t.left.x1,
          t.left.x2,
          t.right.x1,
          t.right.x2,
          t.top.x1,
          t.top.x2,
        ];
        const y = [
          t.bottom.y1,
          t.bottom.y2,
          t.left.y1,
          t.left.y2,
          t.right.y1,
          t.right.y2,
          t.top.y1,
          t.top.y2,
        ];
        return (
          x.every((x) => x >= 0 && x < edgeData.width) &&
          y.every((y) => y >= 0 && y < edgeData.height)
        );
      })
    );
    setRibbons((prev) => [
      ...prev,
      {
        trapezoids,
        id,
        name: `Ribbon ${Math.ceil(id / 2)}`,
        color,
        thickness: 5,
        status: "editing",
        matchedPoints: [],
        reversed: false,
        phase: 2,
        clickedPoints: [[imgX, imgY], ...points],
      } as RibbonData,
    ]);
    setShowOriginalImage(true);
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
                    doubleValue: newConfiguration.brightness,
                  });
                }
                if (newConfiguration.contrast) {
                  window.semClient.send({
                    id: getNextCommandId(),
                    type: "setParam",
                    param: "AP_CONTRAST",
                    doubleValue: newConfiguration.contrast,
                  });
                }
                if (newConfiguration.focus) {
                  window.semClient.send({
                    id: getNextCommandId(),
                    type: "setParam",
                    param: "AP_WD",
                    doubleValue: newConfiguration.focus,
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
          <div class="grid grid-cols-5 gap-4 mt-1">
            <Button
              onClick={() => {
                setImageSrc(null);
                setRibbons([]);
                setZoomState(null);
                setClickedPoints([]);
                setMasks([]);
              }}
            >
              Clear Image
            </Button>
            <Show when={masks().length === 0}>
              <Button
                onClick={() => {
                  const newState = !detection();
                  if (!newState) setClickedPoints([]);
                  setDetection(newState);
                }}
                disabled={detectionLoading()}
              >
                <Show when={detection()} fallback="Enable">
                  Disable
                </Show>{" "}
                Ribbon Detection
              </Button>
              <Show when={clickedPoints().length > 2}>
                <Button
                  onClick={async () => {
                    const points = clickedPoints();
                    setDetection(false);
                    setDetectionLoading(true);
                    const segmentedImageData = await segmentImage({
                      points,
                      canvasRef,
                      filename: imageSrcFilename()!,
                    });
                    setShowOriginalImage(false);
                    setDetectionLoading(false);
                    setMasks(segmentedImageData);
                  }}
                  disabled={detectionLoading() || !props.samLoaded}
                >
                  Detect Ribbon
                </Button>
              </Show>
            </Show>
            <Show when={masks().length > 1}>
              <Button
                onClick={() => {
                  setMasks((prev) => {
                    if (prev.length === 0) return prev;
                    const [mask, ...rest] = prev;
                    return [...rest, mask];
                  });
                }}
              >
                Next mask
              </Button>
              <Button
                onClick={() => {
                  const [mask] = masks();
                  const points = clickedPoints();
                  setMasks([]);
                  setClickedPoints([]);
                  const edgeContext = edgeDataCanvasRef.getContext("2d")!;
                  edgeContext.clearRect(
                    0,
                    0,
                    edgeDataCanvasRef.width,
                    edgeDataCanvasRef.height
                  );
                  const edgeData = edgeFilter(
                    edgeDataCanvasRef,
                    mask,
                    edgeContext
                  );
                  edgeContext.putImageData(edgeData, 0, 0);
                  handleRibbonDetection(points);
                }}
              >
                Accept Mask
              </Button>
            </Show>
            <Show when={ribbons().length > 0}>
              <Button onClick={() => setRibbons([])}>Remove All Ribbons</Button>
            </Show>
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
            <RibbonConfig
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
              ribbon={trapezoidSet}
              setTrapezoidSet={(newTrapezoidSet) => {
                const newTrapezoidSets = ribbons().map((t) =>
                  t.id === newTrapezoidSet.id ? { ...t, ...newTrapezoidSet } : t
                );
                setRibbons(newTrapezoidSets);
              }}
              onDelete={({ id }) =>
                setRibbons(ribbons().filter((t) => t.id !== id))
              }
              ctx={canvasRef.getContext("2d")!}
              onDetectAgain={() => {
                setRibbons((prev) =>
                  prev.filter((s) => s.id !== trapezoidSet.id)
                );
                const points = [...trapezoidSet.clickedPoints];
                // move the first point to the end of the array
                points.push(points.shift()!);
                handleRibbonDetection(points);
              }}
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
            step={1}
          />
        </Show>
        <Show when={detection() && imageSrc()}>
          <span class="text-xl font-bold">
            <Switch>
              <Match when={clickedPoints().length === 0}>
                Click the center point of a slice in the middle of the ribbon
              </Match>
              <Match when={clickedPoints().length === 1}>
                Click the center point of a slice at the start of the ribbon
              </Match>
              <Match when={clickedPoints().length === 2}>
                Click the center point of a slice at the end of the ribbon
              </Match>
              <Match when={clickedPoints().length === 3}>
                Click any other points in the ribbon if desired, or click
                "Detect Ribbon" to finish
              </Match>
            </Switch>
          </span>
        </Show>
      </Show>

      <div
        class="relative"
        classList={{
          hidden: focusedSlice() !== -1 || grabbing(),
        }}
        onMouseMove={(e) => {
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
          setCursorPosition([imgX, imgY]);
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
          ref={edgeDataCanvasRef}
          id="canvas"
          width="1000"
          height="1000"
          class="w-[clamp(300px,_100%,_85vh)] mx-auto absolute top-0 left-[50%] translate-x-[-50%] z-10"
          classList={{
            hidden: !imageSrc() || showOriginalImage(),
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
            "cursor-crosshair": zoomState() !== "pickingCenter" && detection(),
          }}
        ></canvas>
        <Show
          when={imageSrc()}
          fallback={
            <GrabForm
              onGrabbed={(src, filename) => {
                setImageSrc(src);
                setImageSrcFilename(filename);
              }}
            />
          }
        >
          <>
            <h3 class="font-bold text-xl mt-4">Options</h3>
            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-3">
                <p>For fine tuning of all other parameters:</p>
                <Button onClick={() => setParamsHidden(!paramsHidden())}>
                  {paramsHidden() ? "Show" : "Hide"} Additional Parameters
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
                  onChange={(value) => {
                    setOptions("options", "squareSize", value);
                    setOptionsSequence(optionsSequence() + 1);
                  }}
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
                  onChange={(value) => {
                    setOptions("options", "minimumFit", value);
                    setOptionsSequence(optionsSequence() + 1);
                  }}
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
                  onChange={(value) => {
                    setOptions("options", "firstFit", value);
                    setOptionsSequence(optionsSequence() + 1);
                  }}
                />
              </div>
              <Show when={!paramsHidden()}>
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
                    onChange={(value) => {
                      setOptions("options", "houghVoteThreshold", value);
                      setOptionsSequence(optionsSequence() + 1);
                    }}
                  />
                </div>
                <div class="flex-col">
                  <p>
                    This merges all lines that are within this distance of each
                    other.
                  </p>
                  <Param
                    label="Merge Line Threshold"
                    value={options.options.mergeLineThreshold}
                    onChange={(value) => {
                      setOptions("options", "mergeLineThreshold", value);
                      setOptionsSequence(optionsSequence() + 1);
                    }}
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
                    onChange={(value) => {
                      setOptions("options", "pixelThreshold", value);
                      setOptionsSequence(optionsSequence() + 1);
                    }}
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
                    onChange={(value) => {
                      setOptions("options", "maxLines", value);
                      setOptionsSequence(optionsSequence() + 1);
                    }}
                  />
                </div>
                <Button onClick={resetOptions}>Reset Parameters</Button>
              </Show>
            </div>
          </>
        </Show>
      </div>
    </div>
  );
};
