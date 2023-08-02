import {
  convertZoomedCoordinatesToFullImage,
  DrawTrapezoid,
  lerp,
  setupCanvas,
  translateTrapezoid,
} from "@logic/canvas";
import { edgeFilter } from "@logic/edgeFilter";
import { handleFinalImaging, sleep } from "@logic/handleFinalImaging";
import { base64ToImageSrc } from "@logic/image";
import { segmentImage } from "@logic/segmentation";
import {
  computeStageCoordinates,
  StageConfiguration,
} from "@logic/semCoordinates";
import { getIndicesOfSlicesToConfigure } from "@logic/sliceConfiguration";
import { findNearestPoint, isPointInTrapezoid } from "@logic/trapezoids/points";
import { findNearestVertex, moveVertex } from "@logic/trapezoids/vertices";
import { createReducer } from "@solid-primitives/reducer";
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
import { ParameterPanel } from "./ParameterPanel";
import { availableColors, RibbonConfig } from "./RibbonConfig";
import { RibbonDetector } from "./RibbonDetector";
import { SliderPicker } from "./SliderPicker";

const DEFAULT_ZOOM_SCALE = 10;

export const Canvas = (props: { samLoaded: boolean }) => {
  let canvasRef!: HTMLCanvasElement;
  let overlayCanvasRef!: HTMLCanvasElement;
  let edgeDataCanvasRef!: HTMLCanvasElement;

  const [nextId, setNextId] = createSignal(1);
  const [options, setOptions, resetOptions] = createOptionsStore();
  const [optionsSequence, setOptionsSequence] = createSignal(0);
  const [ribbonReducer, ribbonDispatch]: [RibbonReducerState, any] =
    createReducer<RibbonReducerState, any[]>(
      ribbonDispatcher,
      ribbonReducerInitialState
    );

  //not sure if these can be moved/simplified
  const [scanSpeed, setScanSpeed] = createSignal<number>(7);
  const [imageSrc, setImageSrc] = createSignal<string | null>(null);
  const [imageSrcFilename, setImageSrcFilename] = createSignal<string | null>(
    null
  );
  const [showOriginalImage, setShowOriginalImage] = createSignal(true);
  const [focusedSlice, setFocusedSlice] = createSignal<number>(-1);
  const [sliceConfiguration, setSliceConfiguration] = createSignal<
    SliceConfiguration[]
  >([]);
  const [magnification, setMagnification] = createSignal(DEFAULT_MAG);
  const [zoomState, setZoomState] = createSignal<
    ZoomState | "pickingCenter" | null
  >(null);
  const [percentComplete, setPercentComplete] = createSignal(0);
  const [initialStage, setInitialStage] =
    createSignal<StageConfiguration | null>(null);
  const [cursorPosition, setCursorPosition] = createSignal<[number, number]>([
    0, 0,
  ]);
  //we can put this somewhere else
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
    const [mask] = ribbonReducer.masks;
    if (!mask) return;
    const ctx = edgeDataCanvasRef.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(mask, 0, 0);
  });

  createEffect(() => {
    // re-draw the overlay canvas when the ribbons, cursor, detection state, or zoom change
    [...ribbonReducer.ribbons]; // destructering array to create dependency, otherwise its not reactive
    zoomState();
    cursorPosition();
    ribbonReducer.detection;
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
    if (!ribbonReducer.detection) return;
    const rect = canvasRef.getBoundingClientRect();
    const rectWidth = rect.right - rect.left;
    const rectHeight = rect.bottom - rect.top;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imgX = Math.round((x / rectWidth) * canvasRef.width);
    const imgY = Math.round((y / rectHeight) * canvasRef.height);

    ribbonDispatch(actions.setClickedPoints, [
      ...ribbonReducer.clickedPoints,
      [imgX, imgY],
    ]);
    console.log(ribbonReducer.clickedPoints);
  };

  onMount(async () => {
    overlayCanvasRef.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleKeyPress);
    setOriginalImage();
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

    if (ribbonReducer.detection) {
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

      for (const point of ribbonReducer.clickedPoints) {
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

    for (const trapezoidSet of ribbonReducer.ribbons) {
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
      ribbonReducer.ribbons.map((t) => t.trapezoids).flat()
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
      ribbonReducer.ribbons.map((t) => t.trapezoids).flat()
    );
    if (nearestDistance < VERTEX_DIST() || inTrapezoid) {
      ribbonDispatch(actions.setClickedPoint, { x: imgX, y: imgY });
      overlayCanvasRef.addEventListener("mousemove", handleMouseMove);
      overlayCanvasRef.addEventListener("mouseup", handleMouseUp);
      e.preventDefault();
    } else {
      handleClick(e);
    }
  }

  function findTrapezoidSet(trapezoid: Trapezoid) {
    for (const trapezoidSet of ribbonReducer.ribbons) {
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
        ribbonDispatch(actions.setClickedPoint, nearestPoint);
        return;
      } else {
        ribbonDispatch(
          actions.setRibbons,
          ribbonReducer.ribbons.map((t) => {
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
    ribbonDispatch(
      actions.setRibbons,
      ribbonReducer.ribbons.map((t) => {
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
      ribbonReducer.ribbons.map((t) => t.trapezoids).flat()
    );
    const { nearestVertex, nearestDistance } = findNearestVertex(
      imgX,
      imgY,
      ribbonReducer.ribbons.map((t) => t.trapezoids).flat()
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
          ribbonDispatch(
            actions.setRibbons,
            ribbonReducer.ribbons.map((t) => {
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
        const dy = imgY - ribbonReducer.clickedPoint!.y ?? 0;
        const dx = imgX - ribbonReducer.clickedPoint!.x ?? 0;
        ribbonDispatch(actions.setClickedPoint, { x: imgX, y: imgY });
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
          ribbonDispatch(
            actions.setRibbons,
            ribbonReducer.ribbons.map((t) =>
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
        ribbonDispatch(
          actions.setRibbons,
          ribbonReducer.ribbons.map((t) =>
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
      const trapezoid = ribbonReducer.ribbons
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
      const newTrapezoids = ribbonReducer.ribbons.map((t) =>
        t.trapezoids === trapezoidSet?.trapezoids
          ? { ...t, trapezoids: newSet, matchedPoints: [] }
          : t
      );
      ribbonDispatch(actions.setRibbons, newTrapezoids); //TODO double check
    }
  }

  function handleMouseUp() {
    overlayCanvasRef.removeEventListener("mousemove", handleMouseMove);
    overlayCanvasRef.removeEventListener("mouseup", handleMouseUp);

    ribbonDispatch(actions.setClickedPoint, undefined);
  }

  const handleStartGrabbing = async () => {
    setFocusedSlice(-1);
    ribbonDispatch(actions.setGrabbing, true);
    const userConfigurations = sliceConfiguration();
    const ribbon = ribbonReducer.ribbons.find(
      (r) => r.id === ribbonReducer.focusedRibbon
    );
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
    console.log("final config");
    console.log(finalConfigurations);
    try {
      await handleFinalImaging(
        finalConfigurations,
        setPercentComplete,
        scanSpeed()
      );
      alert(`Done imaging for ${ribbon.name}!`);
    } catch (err) {
      console.error(err);
      alert(`Error imaging ${ribbon.name}. ${(err as Error).message}`);
    }
    ribbonDispatch(actions.setGrabbing, false);
    ribbonDispatch(actions.setFocusedRibbon, -1);
  };

  const handleMoveStageToSlice = async () => {
    const ribbon = ribbonReducer.ribbons.find(
      (ribbon) => ribbon.id === ribbonReducer.focusedRibbon
    )!;
    const point = ribbon.matchedPoints[focusedSlice()];
    const coordinates = computeStageCoordinates({
      point,
      canvasConfiguration: canvasRef,
      stageConfiguration: initialStage()!,
    });
    await sleep(200);
    window.semClient.send({
      type: "setParam",
      id: getNextCommandId(),
      param: "AP_STAGE_GOTO_X",
      doubleValue: coordinates.x,
    });
    await sleep(200);
    window.semClient.send({
      type: "setParam",
      id: getNextCommandId(),
      param: "AP_STAGE_GOTO_Y",
      doubleValue: coordinates.y,
    });
  };

  const handleRibbonDetection = async ([[imgX, imgY], ...points]: [
    number,
    number
  ][]) => {
    const trapezoids = await RibbonDetector({
      point: [imgX, imgY],
      edgeDataCanvasRef,
      options: options.options,
    });
    const id = nextId();
    setNextId((prev) => prev + 1);
    ribbonDispatch(actions.setDetection, false); //may need to be called earlier?
    setShowOriginalImage(true);
    const colors = new Set(availableColors);
    ribbonReducer.ribbons.forEach((set) => colors.delete(set.color));
    const color = colors.size > 0 ? colors.values().next().value : "red";
    ribbonDispatch(actions.setRibbons, [
      ...ribbonReducer.ribbons,
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
  };

  return (
    <div class="flex flex-col gap-3 text-xs">
      <Show
        when={ribbonReducer.grabbing}
        fallback={
          <Show when={focusedSlice() !== -1 && initialStage()}>
            <ConfigureSliceCanvas
              stage={initialStage()!}
              magnification={magnification()}
              setMagnification={setMagnification}
              scanSpeed={scanSpeed()}
              setScanSpeed={(value) => setScanSpeed(value)}
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
                console.log("newConfiguration", sliceConfiguration());
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
                ribbonReducer.ribbons.find(
                  (ribbon) => ribbon.id === ribbonReducer.focusedRibbon
                )!
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
                ribbonDispatch(actions.resetImage);
                setZoomState(null);
              }}
            >
              Clear Image
            </Button>
            <Show when={ribbonReducer.masks.length === 0}>
              <Button
                onClick={() => {
                  const newState = !ribbonReducer.detection;
                  if (!newState) ribbonDispatch(actions.setClickedPoints, []);
                  ribbonDispatch(actions.setDetection, newState);
                }}
                disabled={ribbonReducer.detectionLoading}
              >
                <Show when={ribbonReducer.detection} fallback="Enable">
                  Disable
                </Show>{" "}
                Ribbon Detection
              </Button>
              <Show when={ribbonReducer.clickedPoints.length > 2}>
                <Button
                  onClick={async () => {
                    const points = ribbonReducer.clickedPoints;
                    ribbonDispatch(actions.setDetection, false);
                    ribbonDispatch(actions.setDetectionLoading, true);
                    const segmentedImageData = await segmentImage({
                      points,
                      canvasRef,
                      filename: imageSrcFilename()!,
                    });
                    setShowOriginalImage(false);
                    ribbonDispatch(actions.setDetectionLoading, false);
                    ribbonDispatch(actions.setMasks, segmentedImageData);
                  }}
                  disabled={ribbonReducer.detectionLoading || !props.samLoaded}
                >
                  Detect Ribbon
                </Button>
              </Show>
            </Show>
            <Show when={ribbonReducer.masks.length > 1}>
              <Button
                onClick={() => {
                  const prev = ribbonReducer.masks;
                  if (prev.length === 0) return;
                  const [mask, ...rest] = prev;
                  ribbonDispatch(actions.setMasks, [...rest, mask]);
                }}
              >
                Next mask
              </Button>
              <Button
                onClick={() => {
                  const [mask] = ribbonReducer.masks;
                  const points = ribbonReducer.clickedPoints;
                  ribbonDispatch(actions.setMasks, []);
                  ribbonDispatch(actions.setClickedPoints, []);
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
            <Show when={ribbonReducer.ribbons.length > 0}>
              <Button onClick={() => ribbonDispatch(actions.setRibbons, [])}>
                Remove All Ribbons
              </Button>
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
        <For each={ribbonReducer.ribbons}>
          {(trapezoidSet) => (
            <RibbonConfig
              grabbing={ribbonReducer.focusedRibbon === trapezoidSet.id}
              onGrab={async (id) => {
                ribbonDispatch(actions.setFocusedRibbon, id);
                const trapezoids = ribbonReducer.ribbons.find(
                  (t) => t.id === id
                )!.trapezoids;
                const indicesToConfigure = getIndicesOfSlicesToConfigure(
                  trapezoids.length
                );
                const brightness = parseFloat(
                  await getSEMParam("AP_BRIGHTNESS")
                );
                const contrast = parseFloat(await getSEMParam("AP_CONTRAST"));
                const focus = parseFloat(await getSEMParam("AP_WD"));
                window.semClient.send({
                  id: getNextCommandId(),
                  type: "setParam",
                  param: "AP_MAG",
                  doubleValue: magnification(),
                });
                setSliceConfiguration(
                  trapezoids
                    .map(
                      (_, index) =>
                        ({
                          index,
                          brightness,
                          contrast,
                          focus,
                        } as SliceConfiguration)
                    )
                    .filter((_, index) => indicesToConfigure.includes(index))
                );
                setFocusedSlice(indicesToConfigure[0]);
                handleMoveStageToSlice();
              }}
              canvasSize={canvasRef}
              ribbon={trapezoidSet}
              setTrapezoidSet={(newTrapezoidSet) => {
                const newTrapezoidSets = ribbonReducer.ribbons.map((t) =>
                  t.id === newTrapezoidSet.id ? { ...t, ...newTrapezoidSet } : t
                );
                ribbonDispatch(actions.setRibbons, newTrapezoidSets);
              }}
              onDelete={({ id }) =>
                ribbonDispatch(
                  actions.setRibbons,
                  ribbonReducer.ribbons.filter((t) => t.id !== id)
                )
              }
              ctx={canvasRef.getContext("2d")!}
              onDetectAgain={() => {
                ribbonDispatch(
                  actions.setRibbons,
                  ribbonReducer.ribbons.filter((s) => s.id !== trapezoidSet.id)
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
        <Show when={ribbonReducer.detection && imageSrc()}>
          <span class="text-xl font-bold">
            <Switch>
              <Match when={ribbonReducer.clickedPoints.length === 0}>
                Click the center point of a slice in the middle of the ribbon
              </Match>
              <Match when={ribbonReducer.clickedPoints.length === 1}>
                Click the center point of a slice at the start of the ribbon
              </Match>
              <Match when={ribbonReducer.clickedPoints.length === 2}>
                Click the center point of a slice at the end of the ribbon
              </Match>
              <Match when={ribbonReducer.clickedPoints.length === 3}>
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
          hidden: focusedSlice() !== -1 || ribbonReducer.grabbing,
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
            "cursor-crosshair":
              zoomState() !== "pickingCenter" && ribbonReducer.detection,
          }}
        ></canvas>
        <Show
          when={imageSrc()}
          fallback={
            <GrabForm
              onGrabbed={async (src, filename) => {
                setImageSrc(src);
                setImageSrcFilename(filename);

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
                    x: [
                      parseFloat(stageLowLimitX),
                      parseFloat(stageHighLimitX),
                    ],
                    y: [
                      parseFloat(stageLowLimitY),
                      parseFloat(stageHighLimitY),
                    ],
                  },
                });
                console.log(initialStage());
              }}
            />
          }
        >
          <ParameterPanel
            options={options.options}
            setOptions={setOptions}
            optionsSequence={optionsSequence}
            setOptionsSequence={setOptionsSequence}
            scanSpeed={scanSpeed}
            setScanSpeed={setScanSpeed}
            resetOptions={resetOptions}
          />
        </Show>
      </div>
    </div>
  );
};

const ribbonReducerInitialState = {
  ribbons: [] as RibbonData[],
  focusedRibbon: null as RibbonData["id"] | null,
  grabbing: false,
  clickedPoints: [] as [number, number][],
  clickedPoint: null as Vertex | null,
  detection: true,
  detectionLoading: false,
  masks: [] as ImageData[],
};

const actions = {
  setRibbons: "setRibbons",
  setFocusedRibbon: "setFocusedRibbon",
  setGrabbing: "setGrabbing",
  setClickedPoints: "setClickedPoints",
  setClickedPoint: "setClickedPoint",
  setDetection: "setDetection",
  setDetectionLoading: "setDetectionLoading",
  setMasks: "setMasks",
  resetImage: "resetImage",
};

type RibbonReducerState = typeof ribbonReducerInitialState;

const ribbonDispatcher = (
  state: typeof ribbonReducerInitialState,
  action: keyof typeof actions,
  payload: any
) => {
  switch (action) {
    case actions.setRibbons:
      return { ...state, ribbons: payload };
    case actions.setFocusedRibbon:
      return { ...state, focusedRibbon: payload };
    case actions.setGrabbing:
      return { ...state, grabbing: payload };
    case actions.setClickedPoints:
      return { ...state, clickedPoints: payload };
    case actions.setClickedPoint:
      return { ...state, clickedPoint: payload };
    case actions.setDetection:
      return { ...state, detection: payload };
    case actions.setDetectionLoading:
      return { ...state, detectionLoading: payload };
    case actions.setMasks:
      return { ...state, masks: payload };
    case actions.resetImage:
      return { ...state, ribbons: [], masks: [], clickedPoints: [] };
    default:
      return state;
  }
};
