import { For, Show } from "solid-js";
import {
  initialStageSignal,
  magnificationSignal,
  nextSliceIdSignal,
  primaryImageSignal,
  ribbonState,
} from "src/data/signals/globals";
import { microscopeBridge } from "src/MicroscopeBridge/index";
import { getSliceManager } from "src/SliceManager";
import { ShapeSet } from "src/SliceManager/types";
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
  handleRibbonDetection: (
    points: [number, number][],
    clickedPointIndex: number
  ) => void;
}) => {
  const sliceManager = getSliceManager();

  const [ribbonReducer, ribbonDispatch] = ribbonState;
  const [nextSliceId, setNextSliceId] = nextSliceIdSignal;
  const [magnification] = magnificationSignal;
  const [stage] = initialStageSignal;
  const [image] = primaryImageSignal;

  const radioName = () => `status-${props.ribbon.id}`;
  const matchingRadioName = () => `status-${props.ribbon.id}-matching`;

  const setRibbon = (ribbon: Partial<ShapeSet>) => {
    ribbonDispatch({
      action: "updateRibbon",
      payload: { ...props.ribbon, ...ribbon },
    });
  };

  const handleAddTrapezoid = ({ top }: { top: boolean }) => {
    setRibbon({
      ...props.ribbon,
      matchedPoints: [],
      slices: sliceManager.addSlice({
        shapes: props.ribbon.slices,
        id: nextSliceId(),
        top,
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
    </div>
  );
};
