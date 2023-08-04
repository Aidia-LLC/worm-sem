import {
  convertZoomedCoordinatesToFullImage,
  DrawTrapezoid,
  setupCanvas,
  translateTrapezoid,
} from "@logic/canvas";
import { detectRibbons } from "@logic/detectRibbons";
import { base64ToImageSrc } from "@logic/image";
import pointMatching from "@logic/pointMatching";
import { segmentImage } from "@logic/segmentation";
import {
  findNearestPoint,
  isOutOfBounds,
  isPointInTrapezoid,
} from "@logic/trapezoids/points";
import { findNearestVertex, moveVertex } from "@logic/trapezoids/vertices";
import {
  createEffect,
  createSignal,
  For,
  Match,
  onMount,
  Show,
  Switch,
} from "solid-js";
import {
  magnificationSignal,
  optionsStore,
  primaryImageSignal,
  ribbonState,
  showOriginalImageSignal,
  zoomStateSignal,
} from "src/data/signals/globals";
import { microscopeApi } from "src/microscopeApi";
import type { RibbonData, Slice } from "src/types/canvas";
import { Button } from "../Button";
import { SliderPicker } from "../SliderPicker";
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
  const [zoomState, setZoomState] = zoomStateSignal;
  const [magnification] = magnificationSignal;
  const [ribbonReducer, ribbonDispatch] = ribbonState;
  const [showOriginalImage, setShowOriginalImage] = showOriginalImageSignal;
  const [primaryImage, setPrimaryImage] = primaryImageSignal;
  const [cursorPosition, setCursorPosition] = createSignal<[number, number]>([
    0, 0,
  ]);
  const [options] = optionsStore;

  createEffect(() => {
    const [mask] = ribbonReducer().masks;
    if (!mask) return;
    const ctx = edgeDataCanvasRef.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(mask, 0, 0);
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

  const handleClick = async (e: MouseEvent) => {
    if (!ribbonReducer().detection) return;
    const rect = canvasRef.getBoundingClientRect();
    const rectWidth = rect.right - rect.left;
    const rectHeight = rect.bottom - rect.top;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imgX = Math.round((x / rectWidth) * canvasRef.width);
    const imgY = Math.round((y / rectHeight) * canvasRef.height);

    ribbonDispatch({
      action: "setClickedPoints",
      payload: [...ribbonReducer().clickedPoints, [imgX, imgY]],
    });
    console.log(ribbonReducer().clickedPoints);
  };

  onMount(async () => {
    overlayCanvasRef.addEventListener("mousedown", handleMouseDown);
    setOriginalImage();
  });

  async function setOriginalImage() {
    const imageData = primaryImage();
    const src = imageData?.src;
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      debugCanvasRef.width = img.width;
      debugCanvasRef.height = img.height;
      if (!imageData.size)
        setPrimaryImage({
          ...imageData,
          size: { width: img.width, height: img.height },
        });
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

  function draw() {
    const ctx = canvasRef.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    const src = primaryImage()?.src;
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      ctx.canvas.width = img.width;
      ctx.canvas.height = img.height;
      overlayCanvasRef.width = img.width;
      overlayCanvasRef.height = img.height;
      edgeDataCanvasRef.width = img.width;
      edgeDataCanvasRef.height = img.height;

      const zoom = zoomState();
      if (zoom.status === "zoomed-in") {
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
    const vertexDist = options.options.squareSize / 5;
    const rect = canvasRef.getBoundingClientRect();
    const rectWidth = rect.right - rect.left;
    const rectHeight = rect.bottom - rect.top;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imgX1 = Math.round((x / rectWidth) * canvasRef.width);
    const imgY1 = Math.round((y / rectHeight) * canvasRef.height);

    if (zoomState().status === "picking-center") {
      setZoomState({
        status: "zoomed-in",
        scale: DEFAULT_ZOOM_SCALE,
        x: imgX1,
        y: imgY1,
      });
      return;
    }

    const { x: imgX, y: imgY } = convertZoomedCoordinatesToFullImage(
      imgX1,
      imgY1,
      zoomState(),
      canvasRef.width,
      canvasRef.height
    );

    const { inTrapezoid, trapezoid } = isPointInTrapezoid(
      imgX,
      imgY,
      ribbonReducer()
        .ribbons.map((t) => t.slices)
        .flat()
    );
    if (inTrapezoid && trapezoid) {
      const { trapezoidSet } = findTrapezoidSet(trapezoid);
      if (trapezoidSet && trapezoidSet.status === "matching") {
        pointMatching(
          imgX,
          imgY,
          trapezoidSet,
          ribbonDispatch,
          ribbonReducer(),
          overlayCanvasRef,
          handleMouseMove,
          handleMouseUp
        );
        return;
      }
    }
    const { nearestDistance } = findNearestVertex(
      imgX,
      imgY,
      ribbonReducer()
        .ribbons.map((t) => t.slices)
        .flat()
    );
    if (nearestDistance < vertexDist || inTrapezoid) {
      ribbonDispatch({
        action: "setClickedPoint",
        payload: { x: imgX, y: imgY },
      });
      overlayCanvasRef.addEventListener("mousemove", handleMouseMove);
      overlayCanvasRef.addEventListener("mouseup", handleMouseUp);
      e.preventDefault();
    } else {
      handleClick(e);
    }
  }

  function findTrapezoidSet(trapezoid: Slice) {
    for (const trapezoidSet of ribbonReducer().ribbons) {
      if (trapezoidSet.slices.includes(trapezoid)) return { trapezoidSet };
    }
    return { trapezoidSet: undefined };
  }

  //rewrite this to be smaller and rely less on guesswork
  function handleMouseMove(e: MouseEvent) {
    const vertexDist = options.options.squareSize / 5;
    // calculate the new cursor position:
    const rect = canvasRef.getBoundingClientRect();
    const rectWidth = rect.right - rect.left;
    const rectHeight = rect.bottom - rect.top;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imgX1 = Math.round((x / rectWidth) * canvasRef.width);
    const imgY1 = Math.round((y / rectHeight) * canvasRef.height);

    const { x: imgX, y: imgY } = convertZoomedCoordinatesToFullImage(
      imgX1,
      imgY1,
      zoomState(),
      canvasRef.width,
      canvasRef.height
    );

    // are they dragging a point?
    const { inTrapezoid, trapezoid } = isPointInTrapezoid(
      imgX,
      imgY,
      ribbonReducer()
        .ribbons.map((t) => t.slices)
        .flat()
    );
    const { nearestVertex, nearestDistance } = findNearestVertex(
      imgX,
      imgY,
      ribbonReducer()
        .ribbons.map((t) => t.slices)
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
          ribbonDispatch({
            action: "setRibbons",
            payload: ribbonReducer().ribbons.map((t) => {
              if (t.slices === trapezoidSet.slices) {
                return {
                  ...t,
                  matchedPoints: newMatchedPoints,
                };
              }
              return t;
            }),
          });
          return;
        }
      }
      // Dragging a trapezoid
      else if (nearestVertex && nearestDistance > vertexDist && trapezoidSet) {
        const dy = imgY - ribbonReducer().clickedPoint!.y ?? 0;
        const dx = imgX - ribbonReducer().clickedPoint!.x ?? 0;
        ribbonDispatch({
          action: "setDraggingData",
          payload: {
            position: { x: imgX, y: imgY },
            ribbonId: trapezoidSet.id,
            sliceId: trapezoid.id,
          },
        });
        const newTrapezoid = translateTrapezoid(trapezoid, dx, dy);
        // if new trapezoid is touching the edge of the image, delete it
        if (isOutOfBounds(newTrapezoid, canvasRef)) {
          const newTrapezoids = trapezoidSet.slices.filter(
            (t) => t.id !== trapezoid.id
          );
          ribbonDispatch({
            action: "setRibbons",
            payload: ribbonReducer().ribbons.map((t) =>
              t.slices === trapezoidSet.slices
                ? { ...t, slices: newTrapezoids, matchedPoints: [] }
                : t
            ),
          });
          handleMouseUp();
          return;
        }
        const newTrapezoids: Slice[] = trapezoidSet.slices.map((t) =>
          t.id === trapezoid.id ? newTrapezoid : t
        );
        ribbonDispatch({
          action: "setRibbons",
          payload: ribbonReducer().ribbons.map((t) =>
            t.slices === trapezoidSet.slices
              ? { ...t, slices: newTrapezoids, matchedPoints: [] }
              : t
          ),
        });
        return;
      }
    }
    // Dragging a vertex
    if (nearestDistance < 3) return;
    if (nearestVertex && nearestDistance < 15) {
      const trapezoid = ribbonReducer()
        .ribbons.map((t) => t.slices)
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
      const newSet = trapezoidSet?.slices.map((t) =>
        (t.top.x1 === nearestVertex.x && t.top.y1 === nearestVertex.y) ||
        (t.top.x2 === nearestVertex.x && t.top.y2 === nearestVertex.y) ||
        (t.bottom.x1 === nearestVertex.x && t.bottom.y1 === nearestVertex.y) ||
        (t.bottom.x2 === nearestVertex.x && t.bottom.y2 === nearestVertex.y)
          ? newTrapezoid
          : t
      );
      if (!newSet) return;
      const newTrapezoids = ribbonReducer().ribbons.map((t) =>
        t.slices === trapezoidSet?.slices
          ? { ...t, slices: newSet, matchedPoints: [] }
          : t
      );
      ribbonDispatch({
        action: "setRibbons",
        payload: newTrapezoids,
      }); //TODO double check
    }
  }

  function handleMouseUp() {
    overlayCanvasRef.removeEventListener("mousemove", handleMouseMove);
    overlayCanvasRef.removeEventListener("mouseup", handleMouseUp);

    ribbonDispatch({
      action: "setClickedPoint",
      payload: null,
    });
  }

  const handleRibbonDetection = async ([[imgX, imgY], ...points]: [
    number,
    number
  ][]) => {
    console.log("detecting ribbon");
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
        phase: 2,
        clickedPoints: [[imgX, imgY], ...points],
        configurations: [],
      } satisfies RibbonData,
    });
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
          tooltip="Erase the current image. You'll have to grab a new image to continue."
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
              onClick={async () => {
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
              }}
              disabled={ribbonReducer().detectionLoading || !props.samLoaded}
              tooltip="Detect a ribbon from the clicked points. You'll be able to edit the ribbon manually after it's detected."
            >
              Detect Ribbon
            </Button>
          </Show>
        </Show>
        <MaskSelector
          edgeDataCanvasRef={() => edgeDataCanvasRef}
          handleRibbonDetection={handleRibbonDetection}
        />
        <Show when={ribbonReducer().ribbons.length > 0}>
          <Button
            onClick={() =>
              ribbonDispatch({
                action: "setRibbons",
                payload: [],
              })
            }
          >
            Remove All Ribbons
          </Button>
        </Show>
        <Show when={ribbonReducer().masks.length > 0}>
          <Button
            variant="ghost"
            onClick={() => {
              setShowOriginalImage(!showOriginalImage());
            }}
            tooltip="Toggle between the image from the microscope and the edge data."
          >
            Show {showOriginalImage() ? "Edge Data" : "Original Image"}
          </Button>
          <ZoomController />
        </Show>
      </div>
      <For each={ribbonReducer().ribbons}>
        {(ribbon) => (
          <RibbonConfig
            grabbing={ribbonReducer().focusedRibbonId === ribbon.id}
            onGrab={async (id) => {
              const brightness = await microscopeApi.getBrightness();
              const contrast = await microscopeApi.getContrast();
              const focus = await microscopeApi.getWorkingDistance();
              await microscopeApi.setMagnification(magnification());
              ribbonDispatch(
                {
                  action: "setFocusedRibbonId",
                  payload: id,
                },
                {
                  action: "setFocusedSliceIndex",
                  payload: 0,
                },
                {
                  action: "resetSliceConfigurations",
                  payload: { brightness, contrast, focus },
                }
              );
            }}
            canvasSize={canvasRef}
            ribbon={ribbon}
            setTrapezoidSet={(newRibbon) => {
              ribbonDispatch({
                action: "updateRibbon",
                payload: newRibbon,
              });
            }}
            onDelete={(ribbon) =>
              ribbonDispatch({
                action: "deleteRibbon",
                payload: ribbon,
              })
            }
            ctx={canvasRef.getContext("2d")!}
            onDetectAgain={() => {
              ribbonDispatch({
                action: "deleteRibbon",
                payload: ribbon,
              });
              const points = [...ribbon.clickedPoints];
              // move the first point to the end of the array
              points.push(points.shift()!);
              handleRibbonDetection(points);
            }}
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
      <Show when={ribbonReducer().detection}>
        <span class="text-xl font-bold">
          <Switch>
            <Match when={ribbonReducer().clickedPoints.length === 0}>
              Click the center point of a slice in the middle of the ribbon
            </Match>
            <Match when={ribbonReducer().clickedPoints.length === 1}>
              Click the center point of a slice at the start of the ribbon
            </Match>
            <Match when={ribbonReducer().clickedPoints.length === 2}>
              Click the center point of a slice at the end of the ribbon
            </Match>
            <Match when={ribbonReducer().clickedPoints.length === 3}>
              Click any other points in the ribbon if desired, or click "Detect
              Ribbon" to finish
            </Match>
          </Switch>
        </span>
      </Show>

      <div
        class="relative"
        onMouseMove={(e) => {
          const rect = canvasRef.getBoundingClientRect();
          const rectWidth = rect.right - rect.left;
          const rectHeight = rect.bottom - rect.top;
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const imgX1 = Math.round((x / rectWidth) * canvasRef.width);
          const imgY1 = Math.round((y / rectHeight) * canvasRef.height);

          const { x: imgX, y: imgY } = convertZoomedCoordinatesToFullImage(
            imgX1,
            imgY1,
            zoomState(),
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
        ></canvas>
        <canvas
          ref={debugCanvasRef}
          width="1000"
          height="1000"
          class="w-[clamp(300px,_100%,_85vh)] mx-auto absolute top-0 left-[50%] translate-x-[-50%] z-[40]"
        ></canvas>
        <ParameterPanel />
      </div>
    </div>
  );
};
