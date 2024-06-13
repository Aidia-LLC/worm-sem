import { Modal } from "@components/Modal";
import { TemplatePicker } from "@components/TemplatePicker";
import {
  initialStageSignal,
  magnificationSignal,
  nextSliceIdSignal,
  primaryImageSignal,
  ribbonState,
} from "@data/globals";
import { getTemplates, saveTemplate, Template } from "@data/templates";
import { microscopeBridge } from "@MicroscopeBridge/index";
import { getSliceManager } from "@SliceManager/index";
import { ShapeSet } from "@SliceManager/types";
import { createSignal, For, Show } from "solid-js";
import { Button } from "../Button";

export const availableColors = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
];

export const RibbonConfigPanel = (props: {
  ribbon: ShapeSet;
  canvasSize: { width: number; height: number };
  ctx: CanvasRenderingContext2D;
  overlayCtx: CanvasRenderingContext2D;
  edgeCtx: CanvasRenderingContext2D;
  extraCtx: CanvasRenderingContext2D;
  handleRibbonDetection: (
    points: [number, number][],
    clickedPointIndex: number
  ) => void;
  applyTemplate: (details: { template: Template; ribbon: ShapeSet }) => void;
  drawOverlay: VoidFunction;
}) => {
  const sliceManager = getSliceManager();

  const [ribbonReducer, ribbonDispatch] = ribbonState;
  const [nextSliceId, setNextSliceId] = nextSliceIdSignal;
  const [magnification] = magnificationSignal;
  const [stage] = initialStageSignal;
  const [image] = primaryImageSignal;
  const [templates, setTemplates] = createSignal<Template[]>(getTemplates());
  const [slice, setSlice] = createSignal<number | undefined>(0);
  const [showSelect, setShowSelect] = createSignal(false);

  const applyTemplate = (id: number) => {
    const t = templates().find((t) => t.id == id);
    if (!t) return;
    props.applyTemplate({
      template: t,
      ribbon: props.ribbon,
    });
  };

  const radioName = () => `status-${props.ribbon.id}`;
  const matchingRadioName = () => `status-${props.ribbon.id}-matching`;

  const setRibbon = (ribbon: Partial<ShapeSet>) => {
    ribbonDispatch({
      action: "updateRibbon",
      payload: { ...props.ribbon, ...ribbon },
    });
  };

  const handleAddTrapezoid = ({ top }: { top: boolean }) => {
    const edgeData = props.edgeCtx.getImageData(
      0,
      0,
      props.canvasSize.width,
      props.canvasSize.height
    );
    setRibbon({
      ...props.ribbon,
      matchedPoints: [],
      slices: sliceManager.addSlice({
        shapes: props.ribbon.slices,
        id: nextSliceId(),
        top,
        edgeData,
      }),
    });
    setNextSliceId(nextSliceId() + 1);
  };

  const enqueued = () =>
    ribbonReducer()
      .enqueuedRibbons.map((r) => r.ribbon.id)
      .includes(props.ribbon.id);

  const handleDetectAgain = () => {
    ribbonDispatch({
      action: "deleteRibbon",
      payload: props.ribbon,
    });
    const points = [...props.ribbon.referencePoints];
    // move the first point to the end of the array
    points.push(points.shift()!);
    props.handleRibbonDetection(
      points,
      (props.ribbon.referencePointIndex + 1) %
        props.ribbon.referencePoints.length
    );
  };

  return (
    <div
      class="grid grid-cols-7 gap-3 border-2 p-2 rounded-md pr-4 bg-opacity-40"
      classList={{
        "bg-red-300": props.ribbon.color === "red",
        "bg-blue-300": props.ribbon.color === "blue",
        "bg-green-300": props.ribbon.color === "green",
        "bg-yellow-300": props.ribbon.color === "yellow",
        "bg-purple-300": props.ribbon.color === "purple",
        "bg-orange-300": props.ribbon.color === "orange",
      }}
    >
      <div class="flex flex-col gap-1 items-center justify-center font-bold text-lg">
        <input
          class="w-full"
          type="text"
          value={props.ribbon.name}
          onChange={(e) => setRibbon({ name: e.currentTarget.value })}
          disabled={enqueued()}
        />
        <Show when={!enqueued()}>
          <Button
            variant="danger-outline"
            onClick={() =>
              ribbonDispatch({
                action: "deleteRibbon",
                payload: props.ribbon,
              })
            }
          >
            Remove
          </Button>
        </Show>
      </div>
      <Show
        when={!enqueued()}
        fallback={
          <span class="col-span-3 text-md">
            This ribbon has been enqueued for imaging. You can no longer edit
            it.
          </span>
        }
      >
        <div class="flex flex-col gap-1 my-auto">
          <label class="font-bold">Color</label>
          <select
            class="p-2 rounded-md border border-gray-300"
            value={props.ribbon.color}
            onChange={(e) => setRibbon({ color: e.currentTarget.value })}
          >
            <For each={availableColors}>
              {(color) => <option value={color}>{color}</option>}
            </For>
          </select>
        </div>

        <div class="flex flex-col gap-2 justify-between my-auto">
          <label class="font-bold">Status</label>
          <div class="flex flex-col gap-2 justify-between mb-2.5">
            <label class="flex flex-row items-center gap-1">
              <input
                type="radio"
                name={radioName()}
                value="editing"
                checked={props.ribbon.status === "editing"}
                onChange={(e) => {
                  if (e.currentTarget.checked) setRibbon({ status: "editing" });
                }}
              />
              Editing
            </label>
            <label class="flex flex-row items-center gap-1">
              <input
                type="radio"
                name={radioName()}
                value="matching"
                checked={
                  props.ribbon.status === "matching-one" ||
                  props.ribbon.status === "matching-all"
                }
                onChange={(e) => {
                  if (e.currentTarget.checked)
                    setRibbon({ status: "matching-all" });
                }}
              />
              Matching
            </label>
            <label class="flex flex-row items-center gap-1">
              <input
                type="radio"
                name={radioName()}
                value="saved"
                checked={props.ribbon.status === "saved"}
                onChange={(e) => {
                  if (e.currentTarget.checked) setRibbon({ status: "saved" });
                }}
              />
              Locked
            </label>
          </div>
        </div>
        <Show when={props.ribbon.status === "editing"}>
          <div class="flex flex-col gap-1 items-center justify-evenly">
            <Button
              onClick={() => handleAddTrapezoid({ top: true })}
              class="w-full"
              variant="primary-outline"
              tooltip="Add a new slice to the top of the ribbon. You may need to manually adjust the vertices."
            >
              Add slice to top
            </Button>
            <Button
              onClick={() => handleAddTrapezoid({ top: false })}
              class="w-full"
              variant="primary-outline"
              tooltip="Add a new slice to the bottom of the ribbon. You may need to manually adjust the vertices."
            >
              Add slice to bottom
            </Button>
          </div>
          <div class="flex flex-col gap-1 items-center justify-evenly">
            <Button
              variant="ghost"
              onClick={() =>
                setRibbon({ slices: props.ribbon.slices.reverse() })
              }
              tooltip="Reverse the label order of the slices."
            >
              Reverse Direction
            </Button>
            <Show when={props.ribbon.allowDetectAgain}>
              <Button
                onClick={handleDetectAgain}
                class="w-full"
                variant="secondary"
                tooltip="Attempt to detect the slices again, starting from the next point clicked."
              >
                Detect again (point {props.ribbon.referencePointIndex + 1} /{" "}
                {props.ribbon.referencePoints.length})
              </Button>
            </Show>
          </div>
        </Show>
        <Show
          when={
            props.ribbon.status === "matching-all" ||
            props.ribbon.status === "matching-one"
          }
        >
          <div class="flex flex-col gap-1 justify-center col-span-2">
            <label class="flex flex-row items-center gap-1 whitespace-nowrap">
              <input
                type="radio"
                name={matchingRadioName()}
                value="matching-all"
                checked={props.ribbon.status === "matching-all"}
                onChange={(e) => {
                  if (e.currentTarget.checked)
                    setRibbon({ status: "matching-all" });
                }}
              />
              Match Across All Slices
            </label>
            <div class="flex flex-col gap-2"></div>
            <label class="flex flex-row items-center gap-1 whitespace-nowrap">
              <input
                type="radio"
                name={matchingRadioName()}
                value="matching-one"
                checked={props.ribbon.status === "matching-one"}
                onChange={(e) => {
                  if (e.currentTarget.checked)
                    setRibbon({ status: "matching-one" });
                }}
                disabled={props.ribbon.matchedPoints.length === 0}
              />
              Adjust Single Slice
            </label>
            <div class="flex flex-col gap-2"></div>
            <label class="flex flex-row items-center gap-1 whitespace-nowrap">
              <button
                onClick={() => {
                  setShowSelect(true);
                }}
                class="btn btn-primary btn-ghost"
              >
                Choose a Template
              </button>
            </label>
            <div class="flex flex-col gap-2"></div>
            <label class="flex flex-row items-center gap-1 whitespace-nowrap">
              <select
                value={slice() ? slice()! : 0}
                onChange={(e) => {
                  setSlice(e.currentTarget.value as unknown as number);
                }}
                class="select select-primary select-sm"
              >
                <For each={props.ribbon.slices}>
                  {(slice) => (
                    <option value={slice.id}>Slice {slice.id + 1}</option>
                  )}
                </For>
              </select>
              <button
                class="btn btn-ghost btn-primary btn-sm"
                onClick={async () => {
                  //generate picuture with canvas.blob
                  props.ctx.canvas.toBlob(async (blob) => {
                    console.log(blob);
                    if (!blob) return;
                    const s = props.ribbon.slices[slice() || 0];
                    const cropX = s.top.x2;
                    const cropY = s.top.y2;
                    const cropWidth = s.top.x1 - s.top.x2;
                    const cropHeight = s.bottom.y1 - s.top.y1;
                    console.log(s, cropX, cropY, cropWidth, cropHeight);
                    const point = props.ribbon.matchedPoints[slice() || 0];

                    const croppedBlob = await cropImageBlob(
                      blob,
                      cropX - cropWidth / 2,
                      cropY - cropHeight / 2,
                      cropWidth * 2.5,
                      cropHeight * 2.5,
                      props.overlayCtx,
                      props.extraCtx,
                      s,
                      point
                    );

                    if (!croppedBlob) return;

                    croppedBlob.arrayBuffer().then((buffer) => {
                      const data = new Uint8Array(buffer);
                      const blob = new Blob([data], { type: "image/png" });
                      const url = URL.createObjectURL(blob);
                      const img = new Image();
                      img.src = url;
                      img.onload = () => {
                        props.extraCtx.drawImage(img, cropX - cropWidth / 2,
                        cropY - cropHeight / 2,
                        cropWidth,
                        cropHeight,
                        0,
                        0,
                        cropWidth,
                        cropHeight);
                        drawPointAndSlice(point, s, props.extraCtx);

                        const dataUrl = props.extraCtx.canvas.toDataURL();

                        // resize based on slice coordinates
                        saveTemplate({
                          slice: s,
                          point,
                          dataUrl,
                        });
                        setTemplates(getTemplates());
                        props.drawOverlay();
                      };
                    })
                  });
                }}
                disabled={props.ribbon.matchedPoints.length === 0}
              >
                Add Template
              </button>
            </label>
            <div class="flex flex-col gap-2"></div>
            <label class="flex flex-row items-center gap-1 whitespace-nowrap">
              <button
                class="btn btn-outline btn-primary btn-sm"
                onClick={() => {
                  ribbonDispatch({
                    action: "setRibbons",
                    payload: ribbonReducer().ribbons.map((r) => {
                      if (r.id === props.ribbon.id)
                        return { ...r, matchedPoints: [] };
                      return r;
                    }),
                  });
                }}
                disabled={props.ribbon.matchedPoints.length === 0}
              >
                Clear Points
              </button>
            </label>
          </div>
        </Show>
        <Show when={props.ribbon.matchedPoints.length > 0}>
          <div class="flex items-center justify-end">
            <Button
              tooltip="Configure brightness, contrast, and focus for each slice"
              onClick={async () => {
                const s = stage();
                const img = image();
                if (!s || !img?.size)
                  return alert("Image or stage is not loaded");
                const brightness = await microscopeBridge.getBrightness();
                const contrast = await microscopeBridge.getContrast();
                const focus = await microscopeBridge.getWorkingDistance();
                await microscopeBridge.setMagnification(magnification());
                ribbonDispatch(
                  {
                    action: "setFocusedRibbonId",
                    payload: props.ribbon.id,
                  },
                  {
                    action: "setFocusedSliceIndex",
                    payload: 0,
                  },
                  {
                    action: "resetSliceConfigurations",
                    payload: {
                      brightness,
                      contrast,
                      focus,
                      stage: s,
                      canvas: img.size,
                    },
                  }
                );
              }}
            >
              Configure Slices
            </Button>
          </div>
        </Show>
      </Show>
      <Modal show={showSelect()} onClose={() => setShowSelect(false)}>
        <TemplatePicker
          onPick={(template) => {
            applyTemplate(template.id);
            setShowSelect(false);
          }}
          onRefresh={() => setTemplates(getTemplates())}
          templates={templates()}
        />
      </Modal>
    </div>
  );
};

async function cropImageBlob(
  originalBlob: Blob,
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
  overlayCtx: CanvasRenderingContext2D,
  extraCtx: CanvasRenderingContext2D,
  s: any,
  point: [number, number]
): Promise<Blob> {
  // Create an offscreen canvas for the original image
  const originalCtx = overlayCtx;
  const originalCanvas = originalCtx.canvas;

  if (!originalCtx) throw new Error("Could not get canvas context");

  // Load the original blob into an image element
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(originalBlob);
  });

  // Set the canvas size to the image size
  originalCanvas.width = img.width;
  originalCanvas.height = img.height;

  console.log("b4:");
  drawPointAndSlice(point, s, originalCtx);
  console.log("after:");

  // Create another offscreen canvas for the cropped image
  const croppedCanvas = extraCtx.canvas;
  const croppedCtx = extraCtx;

  if (!croppedCtx) throw new Error("Could not get canvas context");

  // Set the canvas size to the crop size
  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;

  // Draw the cropped area onto the new canvas
  croppedCtx.drawImage(
    originalCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  // drawPointAndSlice(point, s, croppedCtx);

  console.log("Cropped canvas:", croppedCanvas);

  // Convert the cropped canvas to a blob
  return new Promise<Blob>((resolve) => {
    croppedCanvas.toBlob((blob) => {
      if (blob) {
        console.log("Cropped blob:", blob);
        resolve(blob);
      } else {
        throw new Error("Could not create blob");
      }
    });
  });
}

const drawPointAndSlice = (
  point: [number, number],
  slice: any,
  ctx: CanvasRenderingContext2D
) => {
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(point[0], point[1], 5, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.closePath();

  //slice - top line, left line, right line, bottom line
  ctx.strokeStyle = "blue";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(slice.top.x1, slice.top.y1);
  ctx.lineTo(slice.top.x2, slice.top.y2);
  ctx.stroke();
  ctx.closePath();

  ctx.beginPath();
  ctx.moveTo(slice.bottom.x1, slice.bottom.y1);
  ctx.lineTo(slice.bottom.x2, slice.bottom.y2);
  ctx.stroke();
  ctx.closePath();

  ctx.beginPath();
  ctx.moveTo(slice.top.x1, slice.top.y1);
  ctx.lineTo(slice.bottom.x1, slice.bottom.y1);
  ctx.stroke();
  ctx.closePath();

  ctx.beginPath();
  ctx.moveTo(slice.top.x2, slice.top.y2);
  ctx.lineTo(slice.bottom.x2, slice.bottom.y2);
  ctx.stroke();
  ctx.closePath();
};
