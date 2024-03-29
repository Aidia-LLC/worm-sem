import * as signals from "@data/globals";
import { getSliceManager } from "@SliceManager/index";
import { Shape, ShapeSet } from "@SliceManager/types";
import { base64ToImageSrc } from "@utils/base64ToImageSrc";
import { convertZoomedCoordinates } from "@utils/convertZoomedCoordinates";
import { segmentImage } from "@utils/segmentImage";
import { setupCanvases } from "@utils/setupCanvases";
import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import { Button } from "../Button";
import { CornerValidation } from "./CornerValidation";
import { DetectionInstructions } from "./DetectionInstructions";
import { MaskSelector } from "./MaskSelector";
import { ParameterPanel } from "./ParameterPanel";
import { availableColors, RibbonConfigPanel } from "./RibbonConfigPanel";
import { ZoomController } from "./ZoomController";
import { ZoomSlider } from "./ZoomSlider";

export const RibbonDetector = (props: { samLoaded: boolean }) => {
  const sliceManager = getSliceManager();
  let canvasRef!: HTMLCanvasElement;
  let overlayCanvasRef!: HTMLCanvasElement;
  let edgeDataCanvasRef!: HTMLCanvasElement;
  let debugCanvasRef!: HTMLCanvasElement;

  const [nextId, setNextId] = signals.nextRibbonIdSignal;
  const [zoomState, setZoomState] = signals.zoomStateSignal;
  const [ribbonReducer, ribbonDispatch] = signals.ribbonState;
  const [showOriginalImage, setShowOriginalImage] =
    signals.showOriginalImageSignal;
  const [primaryImage, setPrimaryImage] = signals.primaryImageSignal;
  const [cursorPosition, setCursorPosition] = createSignal<[number, number]>([
    0, 0,
  ]);
  const [defaultZoomScale] = signals.defaultZoomScaleSignal;

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
    ribbonReducer().corners;
    ribbonReducer().contours;
    ribbonReducer().detection;
    drawOverlay();
  });

  createEffect(() => {
    // re-draw the image canvas when zoom changes
    primaryImage();
    zoomState();
    draw();
  });

  const handleDetectionClick = async (position: [number, number]) =>
    ribbonDispatch({
      action: "setReferencePoints",
      payload: [...ribbonReducer().referencePoints, position],
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
      for (const point of ribbonReducer().referencePoints) {
        ctx.beginPath();
        ctx.arc(point[0], point[1], 10, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
        ctx.closePath();
      }
    }

    for (const trapezoidSet of ribbonReducer().ribbons) {
      const { slices: trapezoids, color, thickness } = trapezoidSet;
      for (let i = 0; i < trapezoids.length; i++) {
        const isFirst = i === 0;
        ctx.globalAlpha = isFirst ? 1 : 0.7;
        sliceManager.drawShape({
          ctx,
          shape: trapezoids[i],
          color,
          thickness,
        });
        ctx.fillStyle = "white";
        ctx.font = `${Math.ceil(thickness * 9)}px Arial`;
        ctx.fillText(`${i + 1}`, trapezoids[i].left.x1, trapezoids[i].left.y1);
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 9 / zoom.scale;
      const radius = (3 / zoom.scale) * 4;
      for (const point of trapezoidSet.matchedPoints) {
        ctx.beginPath();
        ctx.arc(point[0], point[1], radius, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.stroke();
      }
    }

    if (ribbonReducer().cornerValidation) {
      drawPoints(ribbonReducer().corners);
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
    console.log("mouse down");
    e.preventDefault();
    const { x: imgX, y: imgY, unzoomed } = getImageCoordinatesFromMouseEvent(e);

    if (zoomState().status === "picking-center") {
      setZoomState({
        status: "zoomed-in",
        scale: defaultZoomScale(),
        x: unzoomed.x,
        y: unzoomed.y,
      });
      return;
    }

    if (ribbonReducer().cornerValidation) {
      if (ribbonReducer().cornerPhase === "delete") {
        let points = ribbonReducer().corners;
        const clickedPointIndex = points.findIndex(
          (p) => Math.abs(p[0] - imgX) < 15 && Math.abs(p[1] - imgY) < 15
        );
        console.log("clickedPointIndex", clickedPointIndex, points, imgX, imgY);
        if (clickedPointIndex !== -1) {
          ribbonDispatch({
            action: "setCorners",
            payload: points.filter((_, i) => i !== clickedPointIndex),
          });
          points = points.filter((_, i) => i !== clickedPointIndex);
        }

        drawPoints(points);
        return;
      } else if (ribbonReducer().cornerPhase === "add") {
        // find circle-line intersection
        const points = ribbonReducer().corners;
        for (let i = 0; i < points.length; i++) {
          const distance = sliceManager.distanceSegmentToPoint(
            { x: points[i][0], y: points[i][1] },
            {
              x: points[i + 1 > points.length - 1 ? 0 : i + 1][0],
              y: points[i + 1 > points.length - 1 ? 0 : i + 1][1],
            },
            { x: imgX, y: imgY }
          );
          if (distance < 10) {
            const newPoints: [number, number][] = [
              ...points.slice(0, i + 1),
              [imgX, imgY],
              ...points.slice(i + 1),
            ];
            ribbonDispatch({
              action: "setCorners",
              payload: newPoints,
            });
            drawPoints(newPoints);
            return;
          }
        }

        return;
      } else if (ribbonReducer().cornerPhase === "adjust") {
        const points = ribbonReducer().corners;
        const clickedPointIndex = points.findIndex(
          (p) => Math.abs(p[0] - imgX) < 15 && Math.abs(p[1] - imgY) < 15
        );
        ribbonDispatch({
          action: "setDraggingData",
          payload: {
            position: [imgX, imgY],
            ribbonId: -1,
            sliceId: clickedPointIndex,
          },
        });
        return;
      }
    }

    if (ribbonReducer().detection) {
      handleDetectionClick([imgX, imgY]);
      return;
    }

    const dragVertexThreshold = canvasRef.width / 120;
    const nearest = sliceManager.findNearestVertex({
      point: [imgX, imgY],
      shapeSets: ribbonReducer().ribbons,
    });
    if (nearest.distance < dragVertexThreshold) {
      ribbonDispatch({
        action: "setDraggingData",
        payload: {
          position: [imgX, imgY],
          ribbonId: nearest.ribbonId,
          sliceId: nearest.slice.id,
          vertexPosition: nearest.vertexPosition,
        },
      });
      return;
    }

    const containingSlice = sliceManager.findContainingSlice({
      point: [imgX, imgY],
      sets: ribbonReducer().ribbons,
    });
    const inTrapezoid = Boolean(containingSlice);
    const slice = containingSlice?.slice;
    const ribbon = containingSlice?.set;
    console.log("containingSlice", containingSlice, slice, ribbon, inTrapezoid);
    if (inTrapezoid && slice && ribbon) {
      if (
        ribbon.status === "matching-one" ||
        ribbon.status === "matching-all"
      ) {
        handlePointMatching({
          ribbon,
          slice,
          point: [imgX, imgY],
        });
      }
      console.log("in trapezoid");
      ribbonDispatch({
        action: "setDraggingData",
        payload: {
          position: [imgX, imgY],
          ribbonId: ribbon.id,
          sliceId: slice.id,
        },
      });
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
      ...convertZoomedCoordinates(
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

  const handlePointMatching = (details: {
    point: [number, number];
    ribbon: ShapeSet;
    slice: Shape;
  }) => {
    const newPoints = sliceManager.matchPoints(details);
    ribbonDispatch({
      action: "setRibbons",
      payload: ribbonReducer().ribbons.map((r) => {
        if (r.id === details.ribbon.id)
          return { ...r, matchedPoints: newPoints };
        return r;
      }),
    });
  };

  const handleCornerMove = (e: MouseEvent) => {
    const { x: imgX, y: imgY } = getImageCoordinatesFromMouseEvent(e);
    const points = ribbonReducer().corners;
    const clickedPointIndex = ribbonReducer().draggingData?.sliceId ?? -1;
    console.log("clickedPointIndex", clickedPointIndex, points, imgX, imgY);
    if (clickedPointIndex !== -1) {
      const newPoints: [number, number][] = [
        ...points.slice(0, clickedPointIndex),
        [imgX, imgY],
        ...points.slice(clickedPointIndex + 1),
      ];
      ribbonDispatch({
        action: "setCorners",
        payload: newPoints,
      });
      drawPoints(newPoints);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    e.preventDefault();

    const draggingData = ribbonReducer().draggingData;
    const { x, y } = getImageCoordinatesFromMouseEvent(e);
    setCursorPosition([x, y]);
    if (
      !draggingData ||
      draggingData.sliceId === undefined ||
      draggingData === null
    )
      return;

    if (ribbonReducer().cornerValidation) {
      handleCornerMove(e);
      return;
    }
    console.log("draggingData", draggingData);

    ribbonDispatch({
      action: "setDraggingData",
      payload: {
        ...draggingData,
        position: [x, y],
      },
    });

    const dx = x - draggingData.position[0];
    const dy = y - draggingData.position[1];

    const ribbon = ribbonReducer().ribbons.find(
      (r) => r.id === draggingData.ribbonId
    )!;
    const slice = ribbon.slices.find((t) => t.id === draggingData.sliceId);
    if (!slice) return;
    if (ribbon.status === "matching-all" || ribbon.status === "matching-one") {
      handlePointMatching({
        point: [x, y],
        ribbon,
        slice,
      });
    } else if (ribbon.status === "editing") {
      if (draggingData.vertexPosition) {
        // dragging a vertex
        const pos = draggingData.vertexPosition;
        const newSlice = sliceManager.translateSliceVertex({
          position: pos,
          dx,
          dy,
          slice,
        });
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
        const newSlice = sliceManager.translateSlice({ slice, dx, dy });
        if (
          sliceManager.isOutOfBounds({ shape: newSlice, canvas: canvasRef })
        ) {
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
          const newSlices: Shape[] = ribbon.slices.map((t) =>
            t.id === slice.id ? newSlice : t
          );
          ribbonDispatch(
            {
              action: "setDraggingData",
              payload: {
                position: [x, y],
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

  const handleRibbonDetection = async () => {
    const edgeContext = edgeDataCanvasRef.getContext("2d")!;
    const edgeData = edgeContext.getImageData(
      0,
      0,
      edgeDataCanvasRef.width,
      edgeDataCanvasRef.height
    );
    const { corners, imageData } = sliceManager.findCorners({
      imageContext: edgeContext,
      imageData: edgeData,
    });

    edgeContext.putImageData(imageData, 0, 0);
    drawPoints(corners);

    ribbonDispatch({
      action: "setCornerValidation",
      payload: true,
    });
    ribbonDispatch({
      action: "setCorners",
      payload: corners,
    });
  };

  const drawPoints = (points: [number, number][]) => {
    const overlayContext = overlayCanvasRef.getContext("2d")!;

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      overlayContext.beginPath();
      overlayContext.arc(point[0], point[1], 10, 0, 2 * Math.PI);
      overlayContext.fillStyle = "blue";
      overlayContext.lineWidth = 3;
      overlayContext.fill();
      overlayContext.moveTo(point[0], point[1]);
      const nextPoint = points[i + 1 > points.length - 1 ? 0 : i + 1];
      overlayContext.lineTo(nextPoint[0], nextPoint[1]);
      overlayContext.strokeStyle = "blue";
      overlayContext.lineWidth = 1;
      overlayContext.stroke();
    }
  };

  const handleCornerValidation = () => {
    const edgeContext = edgeDataCanvasRef.getContext("2d")!;
    const organizedPoints = ribbonReducer().corners;
    const validSlices = sliceManager.getValidSlices(organizedPoints);
    for (const slice of validSlices) {
      edgeContext.beginPath();
      edgeContext.moveTo(slice[0][0][0], slice[0][0][1]);
      edgeContext.lineTo(slice[1][0][0], slice[1][0][1]);
      edgeContext.lineTo(slice[2][0][0], slice[2][0][1]);
      edgeContext.lineTo(slice[3][0][0], slice[3][0][1]);
      edgeContext.lineTo(slice[0][0][0], slice[0][0][1]);
      edgeContext.strokeStyle = "red";
      edgeContext.lineWidth = 2;
      edgeContext.stroke();
    }
    const slices = validSlices.map((slice, i) => {
      return {
        left: {
          x1: slice[0][0][0],
          y1: slice[0][0][1],
          x2: slice[1][0][0],
          y2: slice[1][0][1],
        },
        right: {
          x1: slice[3][0][0],
          y1: slice[3][0][1],
          x2: slice[2][0][0],
          y2: slice[2][0][1],
        },
        top: {
          x1: slice[0][0][0],
          y1: slice[0][0][1],
          x2: slice[3][0][0],
          y2: slice[3][0][1],
        },
        bottom: {
          x1: slice[1][0][0],
          y1: slice[1][0][1],
          x2: slice[2][0][0],
          y2: slice[2][0][1],
        },
        id: i,
      };
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
        slices,
        id,
        name: `Ribbon ${id}`,
        color,
        thickness: 5,
        status: "editing",
        matchedPoints: [],
        referencePoints: [],
        referencePointIndex: 0,
        configurations: [],
        slicesToConfigure: [],
        slicesToMove: [],
        allowDetectAgain: false,
      } satisfies ShapeSet,
    });
    ribbonDispatch({
      action: "setCornerValidation",
      payload: false,
    });
  };

  const handleMask = async () => {
    const points = ribbonReducer().referencePoints;
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
                ribbonDispatch({ action: "setReferencePoints", payload: [] });
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
          <Show when={ribbonReducer().referencePoints.length > 2}>
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
        <Show
          when={
            ribbonReducer().masks.length > 0 || ribbonReducer().cornerValidation
          }
        >
          <Button
            variant="ghost"
            onClick={() => setShowOriginalImage(!showOriginalImage())}
            tooltip="Toggle between the image from the microscope and the edge data."
          >
            Show {showOriginalImage() ? "Edge Data" : "Original Image"}
          </Button>
        </Show>
        <ZoomController />
      </div>
      <MaskSelector
        edgeDataCanvasRef={() => edgeDataCanvasRef}
        handleRibbonDetection={handleRibbonDetection}
      />
      <CornerValidation
        edgeDataCanvasRef={() => edgeDataCanvasRef}
        handleCornerValidation={handleCornerValidation}
        handleRibbonDetection={handleRibbonDetection}
      />
      <Show
        when={
          ribbonReducer().masks.length === 0 &&
          !ribbonReducer().detection &&
          !ribbonReducer().cornerValidation
        }
      >
        <For each={ribbonReducer().ribbons}>
          {(ribbon) => (
            <RibbonConfigPanel
              canvasSize={canvasRef}
              ribbon={ribbon}
              ctx={canvasRef.getContext("2d")!}
              handleRibbonDetection={handleRibbonDetection}
            />
          )}
        </For>
      </Show>
      <ZoomSlider />
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
          class="w-[clamp(300px,_100%,_85vh)] mx-auto absolute top-0 left-[50%] translate-x-[-50%] z-[40] invisible"
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
