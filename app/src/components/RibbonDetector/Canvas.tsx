import type { RibbonData, Slice } from "@data/shapes";
import {
  convertZoomedCoordinatesToFullImage,
  DrawTrapezoid,
  setupCanvases,
  translateTrapezoid,
} from "@logic/canvas";
import { detectRibbons } from "@logic/detectRibbons";
import { base64ToImageSrc } from "@logic/image";
import pointMatching from "@logic/pointMatching";
import { segmentImage } from "@logic/segmentation";
import { isOutOfBounds, isPointInTrapezoid } from "@logic/trapezoids/points";
import {
  findNearestVertex,
  translateSliceVertex,
} from "@logic/trapezoids/vertices";
import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import * as signals from "src/data/signals/globals";
import { Button } from "../Button";
import { SliderPicker } from "../SliderPicker";
import { DetectionInstructions } from "./DetectionInstructions";
import { MaskSelector } from "./MaskSelector";
import { ParameterPanel } from "./ParameterPanel";
import { availableColors, RibbonConfig } from "./RibbonConfig";
import { DEFAULT_ZOOM_SCALE, ZoomController } from "./ZoomController";

export const Canvas = (props: { samLoaded: boolean }) => {
  let canvasRef!: HTMLCanvasElement;
  let overlayCanvasRef!: HTMLCanvasElement;
  let edgeDataCanvasRef!: HTMLCanvasElement;
  let debugCanvasRef!: HTMLCanvasElement;

  const [nextId, setNextId] = createSignal(1);
  const [zoomState, setZoomState] = signals.zoomStateSignal;
  const [ribbonReducer, ribbonDispatch] = signals.ribbonState;
  const [showOriginalImage, setShowOriginalImage] =
    signals.showOriginalImageSignal;
  const [primaryImage, setPrimaryImage] = signals.primaryImageSignal;
  const [cursorPosition, setCursorPosition] = createSignal<[number, number]>([
    0, 0,
  ]);
  const [options] = signals.optionsStore;

  createEffect(() => {
    const state = ribbonReducer();
    if (state.masks.length === 0 || state.currentMaskIndex === -1) return;
    const ctx = edgeDataCanvasRef.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(state.masks[state.currentMaskIndex], 0, 0);
  });

  createEffect(() => {
    // re-draw the overlay canvas when the ribbons, cursor, detection state, or zoom change
    [...ribbonReducer().ribbons]; // destructuring array to create dependency, otherwise its not reactive
    zoomState();
    cursorPosition();
    ribbonReducer().detection;
    drawOverlay();
  });

  createEffect(() => {
    // re-draw the image canvas when zoom changes
    primaryImage();
    zoomState();
    draw();
  });

  const handleDetectionClick = async (position: { x: number; y: number }) =>
    ribbonDispatch({
      action: "setClickedPoints",
      payload: [...ribbonReducer().clickedPoints, [position.x, position.y]],
    });

  onMount(async () => {
    const imageData = primaryImage();
    if (!imageData?.src) return;
    const size = await setupCanvases({
      primaryCanvas: canvasRef,
      src: imageData.src,
      canvases: [overlayCanvasRef, edgeDataCanvasRef, debugCanvasRef],
    });
    setPrimaryImage({ ...imageData, size });
  });

  const drawOverlay = () => {
    const ctx = overlayCanvasRef.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    ctx.save();

    const zoom = zoomState();
    if (zoom.status === "zoomed-in") {
      const { x, y, scale } = zoom;
      ctx.translate(canvasRef.width / 2, canvasRef.height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-x, -y);
    }

    if (ribbonReducer().detection) {
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

      for (const point of ribbonReducer().clickedPoints) {
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

    for (const trapezoidSet of ribbonReducer().ribbons) {
      const { slices: trapezoids, color, thickness } = trapezoidSet;
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
      ctx.lineWidth = 9 / zoom.scale;
      const radius = (3 / zoom.scale) * 4;
      for (const point of trapezoidSet.matchedPoints) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  const draw = () => {
    const ctx = canvasRef.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    const src = primaryImage()?.src;
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const zoom = zoomState();
      if (zoom.status !== "zoomed-in") return ctx.drawImage(img, 0, 0);
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
    };
    img.src = base64ToImageSrc(src);
  };

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    const { x: imgX, y: imgY, unzoomed } = getImageCoordinatesFromMouseEvent(e);

    if (zoomState().status === "picking-center") {
      setZoomState({
        status: "zoomed-in",
        scale: DEFAULT_ZOOM_SCALE,
        x: unzoomed.x,
        y: unzoomed.y,
      });
      return;
    }

    if (ribbonReducer().detection) {
      handleDetectionClick({ x: imgX, y: imgY });
      return;
    }

    const dragVertexThreshold = canvasRef.width / 120;
    const nearest = findNearestVertex(imgX, imgY, ribbonReducer().ribbons);
    if (nearest.distance < dragVertexThreshold) {
      ribbonDispatch({
        action: "setDraggingData",
        payload: {
          position: { x: imgX, y: imgY },
          ribbonId: nearest.ribbonId,
          sliceId: nearest.slice.id,
          vertexPosition: nearest.vertexPosition,
        },
      });
      return;
    }

    const { inTrapezoid, slice, ribbon } = isPointInTrapezoid(
      imgX,
      imgY,
      ribbonReducer().ribbons
    );
    if (inTrapezoid && slice && ribbon) {
      if (ribbon.status === "matching") {
        pointMatching(
          imgX,
          imgY,
          ribbon,
          ribbonDispatch,
          ribbonReducer(),
          overlayCanvasRef,
          handleMouseMove,
          handleMouseUp
        );
        return;
      } else if (ribbon.status === "editing") {
        ribbonDispatch({
          action: "setDraggingData",
          payload: {
            position: { x: imgX, y: imgY },
            ribbonId: ribbon.id,
            sliceId: slice.id,
          },
        });
        return;
      }
    }
  };

  const getImageCoordinatesFromMouseEvent = (e: {
    clientX: number;
    clientY: number;
  }) => {
    const rect = canvasRef.getBoundingClientRect();
    const rectWidth = rect.right - rect.left;
    const rectHeight = rect.bottom - rect.top;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imgX1 = Math.round((x / rectWidth) * canvasRef.width);
    const imgY1 = Math.round((y / rectHeight) * canvasRef.height);
    return {
      ...convertZoomedCoordinatesToFullImage(
        imgX1,
        imgY1,
        zoomState(),
        canvasRef.width,
        canvasRef.height
      ),
      unzoomed: {
        x: imgX1,
        y: imgY1,
      },
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    e.preventDefault();
    const draggingData = ribbonReducer().draggingData;
    const { x, y } = getImageCoordinatesFromMouseEvent(e);
    setCursorPosition([x, y]);
    if (!draggingData || !draggingData.sliceId) return;

    ribbonDispatch({
      action: "setDraggingData",
      payload: {
        ...draggingData,
        position: { x: x, y: y },
      },
    });

    const dx = x - draggingData.position.x;
    const dy = y - draggingData.position.y;

    const ribbon = ribbonReducer().ribbons.find(
      (r) => r.id === draggingData.ribbonId
    )!;
    if (ribbon.status === "matching") {
      const newMatchedPoints = ribbon.matchedPoints.map((point, i) => {
        if (ribbon.slices[i].id === draggingData.sliceId) return { x, y };
        return point;
      });
      ribbonDispatch({
        action: "setRibbons",
        payload: ribbonReducer().ribbons.map((t) => {
          if (t.id === ribbon.id)
            return { ...t, matchedPoints: newMatchedPoints };
          return t;
        }),
      });
      return;
    } else if (ribbon.status === "editing") {
      const slice = ribbon.slices.find((t) => t.id === draggingData.sliceId);
      if (!slice) return;
      if (draggingData.vertexPosition) {
        // dragging a vertex
        const pos = draggingData.vertexPosition;
        const newSlice = translateSliceVertex(slice, pos, { x: dx, y: dy });
        ribbonDispatch({
          action: "setRibbons",
          payload: ribbonReducer().ribbons.map((t) =>
            t.id === ribbon.id
              ? {
                  ...t,
                  slices: t.slices.map((s) =>
                    s.id === slice.id ? newSlice : s
                  ),
                  matchedPoints: [],
                }
              : t
          ),
        });
      } else {
        // dragging a slice
        const newSlice = translateTrapezoid(slice, dx, dy);
        if (isOutOfBounds(newSlice, canvasRef)) {
          const newSlices = ribbon.slices.filter((t) => t.id !== slice.id);
          if (newSlices.length === 0) {
            ribbonDispatch({ action: "deleteRibbon", payload: ribbon });
          } else {
            ribbonDispatch({
              action: "setRibbons",
              payload: ribbonReducer().ribbons.map((r) =>
                r.id === ribbon.id
                  ? { ...r, slices: newSlices, matchedPoints: [] }
                  : r
              ),
            });
          }
          handleMouseUp();
          return;
        } else {
          const newSlices: Slice[] = ribbon.slices.map((t) =>
            t.id === slice.id ? newSlice : t
          );
          ribbonDispatch(
            {
              action: "setDraggingData",
              payload: {
                position: { x, y },
                ribbonId: ribbon.id,
                sliceId: slice.id,
              },
            },
            {
              action: "setRibbons",
              payload: ribbonReducer().ribbons.map((r) =>
                r.id === ribbon.id
                  ? { ...r, slices: newSlices, matchedPoints: [] }
                  : r
              ),
            }
          );
          return;
        }
      }
    }
  };

  const handleMouseUp = () => {
    ribbonDispatch({
      action: "setDraggingData",
      payload: null,
    });
  };

  const handleRibbonDetection = async ([[imgX, imgY], ...points]: [
    number,
    number
  ][]) => {
    const trapezoids = await detectRibbons({
      point: [imgX, imgY],
      edgeDataCanvasRef,
      overlayCanvasRef: debugCanvasRef,
      options: options.options,
    });
    const id = nextId();
    setNextId((prev) => prev + 1);
    ribbonDispatch({
      action: "setDetection",
      payload: false,
    });
    setShowOriginalImage(true);
    const colors = new Set(availableColors);
    ribbonReducer().ribbons.forEach((set) => colors.delete(set.color));
    const color = colors.size > 0 ? colors.values().next().value : "red";
    ribbonDispatch({
      action: "addRibbon",
      payload: {
        slices: trapezoids,
        id,
        name: `Ribbon ${Math.ceil(id / 2)}`,
        color,
        thickness: 5,
        status: "editing",
        matchedPoints: [],
        clickedPoints: [[imgX, imgY], ...points],
        configurations: [],
        slicesToConfigure: [],
      } satisfies RibbonData,
    });
  };

  const handleMask = async () => {
    const points = ribbonReducer().clickedPoints;
    ribbonDispatch(
      { action: "setDetection", payload: false },
      { action: "setDetectionLoading", payload: true }
    );
    const segmentedImageData = await segmentImage({
      points,
      canvasRef,
      filename: primaryImage()?.filename ?? "",
    });
    setShowOriginalImage(false);
    ribbonDispatch(
      { action: "setDetectionLoading", payload: false },
      { action: "setMasks", payload: segmentedImageData }
    );
  };

  return (
    <div class="flex flex-col gap-3 text-xs">
      <div class="grid grid-cols-5 gap-4 mt-1">
        <Button
          variant="ghost"
          onClick={() => {
            setPrimaryImage(null);
            ribbonDispatch({ action: "resetImage" });
            setZoomState({ status: "zoomed-out", scale: 1 });
          }}
          tooltip="Clear the current grabbed image. Do this when you've enqueued all of the ribbons in the current image."
        >
          Clear Image
        </Button>
        <Show when={ribbonReducer().masks.length === 0}>
          <Button
            variant="primary-outline"
            onClick={() => {
              const newState = !ribbonReducer().detection;
              if (!newState)
                ribbonDispatch({ action: "setClickedPoints", payload: [] });
              ribbonDispatch({ action: "setDetection", payload: newState });
            }}
            disabled={ribbonReducer().detectionLoading}
            tooltip="Toggle ribbon detection. If enabled, click on the image to select a ribbon. If disabled, you won't be able to detect a new ribbon."
          >
            <Show when={ribbonReducer().detection} fallback="Enable">
              Disable
            </Show>{" "}
            Ribbon Detection
          </Button>
          <Show when={ribbonReducer().clickedPoints.length > 2}>
            <Button
              onClick={handleMask}
              disabled={ribbonReducer().detectionLoading || !props.samLoaded}
              tooltip={
                props.samLoaded
                  ? "Detect a ribbon from the clicked points. You'll be able to edit the ribbon manually after it's detected."
                  : "Initializing mask detection... Please wait."
              }
            >
              Detect Ribbon
            </Button>
          </Show>
        </Show>
        <Show when={ribbonReducer().ribbons.length > 0}>
          <Button
            onClick={() =>
              ribbonDispatch({ action: "setRibbons", payload: [] })
            }
          >
            Remove All Ribbons
          </Button>
        </Show>
        <Show when={ribbonReducer().masks.length > 0}>
          <Button
            variant="ghost"
            onClick={() => setShowOriginalImage(!showOriginalImage())}
            tooltip="Toggle between the image from the microscope and the edge data."
          >
            Show {showOriginalImage() ? "Edge Data" : "Original Image"}
          </Button>
          <ZoomController />
        </Show>
      </div>
      <MaskSelector
        edgeDataCanvasRef={() => edgeDataCanvasRef}
        handleRibbonDetection={handleRibbonDetection}
      />
      <For each={ribbonReducer().ribbons}>
        {(ribbon) => (
          <RibbonConfig
            canvasSize={canvasRef}
            ribbon={ribbon}
            ctx={canvasRef.getContext("2d")!}
            handleRibbonDetection={handleRibbonDetection}
          />
        )}
      </For>
      <Show when={zoomState().status === "zoomed-in"}>
        <SliderPicker
          label="Zoom"
          value={zoomState().scale}
          setValue={(scale) => {
            const zoom = zoomState();
            if (zoom.status !== "zoomed-in") return;
            setZoomState({ ...zoom, scale });
          }}
          unit="x"
          max={15}
          min={1}
          step={1}
        />
      </Show>
      <DetectionInstructions />
      <div class="relative">
        <canvas
          ref={canvasRef}
          id="canvas"
          width="1000"
          height="1000"
          class="w-[clamp(300px,_100%,_85vh)] mx-auto"
        ></canvas>
        <canvas
          ref={edgeDataCanvasRef}
          id="canvas"
          width="1000"
          height="1000"
          class="w-[clamp(300px,_100%,_85vh)] mx-auto absolute top-0 left-[50%] translate-x-[-50%] z-10"
          classList={{
            hidden: showOriginalImage(),
          }}
        ></canvas>
        <canvas
          ref={debugCanvasRef}
          width="1000"
          height="1000"
          class="w-[clamp(300px,_100%,_85vh)] mx-auto absolute top-0 left-[50%] translate-x-[-50%] z-[40]"
        ></canvas>
        <canvas
          ref={overlayCanvasRef}
          id="canvas"
          width="1000"
          height="1000"
          class="w-[clamp(300px,_100%,_85vh)] mx-auto absolute top-0 left-[50%] translate-x-[-50%] z-50"
          classList={{
            "cursor-zoom-in": zoomState().status === "picking-center",
            "cursor-crosshair":
              zoomState().status !== "picking-center" &&
              ribbonReducer().detection,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        ></canvas>
        <ParameterPanel />
      </div>
    </div>
  );
};
