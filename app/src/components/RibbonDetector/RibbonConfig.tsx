import { addTrapezoid } from "@logic/trapezoids/addTrapezoid";
import { microscopeApi } from "@microscopeApi/index";
import { For, Show } from "solid-js";
import {
  magnificationSignal,
  nextSliceIdSignal,
  ribbonState,
} from "src/data/signals/globals";
import { RibbonData } from "src/types/canvas";
import { Button } from "../Button";

export const availableColors = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
];

export const RibbonConfig = (props: {
  ribbon: RibbonData;
  canvasSize: { width: number; height: number };
  ctx: CanvasRenderingContext2D;
  handleRibbonDetection: (points: [number, number][]) => void;
}) => {
  const [_, ribbonDispatch] = ribbonState;
  const [nextSliceId, setNextSliceId] = nextSliceIdSignal;
  const [magnification] = magnificationSignal;

  const radioName = () => `status-${props.ribbon.id}`;

  const setRibbon = (ribbon: Partial<RibbonData>) => {
    ribbonDispatch({
      action: "updateRibbon",
      payload: { ...props.ribbon, ...ribbon },
    });
  };

  const handleAddTrapezoid = ({ top }: { top: boolean }) => {
    setRibbon({
      ...props.ribbon,
      slices: addTrapezoid({
        trapezoids: props.ribbon.slices,
        id: nextSliceId(),
        top,
      }),
    });
    setNextSliceId(nextSliceId() + 1);
  };

  const handleDetectAgain = () => {
    ribbonDispatch({
      action: "deleteRibbon",
      payload: props.ribbon,
    });
    const points = [...props.ribbon.clickedPoints];
    // move the first point to the end of the array
    points.push(points.shift()!);
    props.handleRibbonDetection(points);
  };

  return (
    <div
      class="grid grid-cols-9 gap-3 border-2 p-2 rounded-md pr-4 bg-opacity-40"
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
        />
        <button
          class="text-white font-bold py-1 px-2 text-xs rounded transition-colors bg-red-500 hover:bg-red-700 active:bg-red-800"
          onClick={() =>
            ribbonDispatch({
              action: "deleteRibbon",
              payload: props.ribbon,
            })
          }
        >
          Remove
        </button>
      </div>
      <Show when={props.ribbon.phase === 2}>
        <div class="flex flex-col gap-1 col-span-2 my-auto">
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

        <div
          class="flex flex-col gap-2 justify-between my-auto"
          classList={{
            "col-span-4": props.ribbon.matchedPoints.length === 0,
            "col-span-3": props.ribbon.matchedPoints.length > 0,
          }}
        >
          <label class="font-bold">Status</label>
          <div class="flex flex-row gap-2 justify-between mb-2.5">
            <div class="flex flex-col gap-2">
              <label class="flex flex-row items-center gap-1">
                <input
                  type="radio"
                  name={radioName()}
                  value="editing"
                  checked={props.ribbon.status === "editing"}
                  onChange={(e) => {
                    if (e.currentTarget.checked)
                      setRibbon({ status: "editing" });
                  }}
                />
                Editing
              </label>
              <Show when={props.ribbon.status === "editing"}>
                <button
                  class="text-white font-bold py-1 px-2 text-xs rounded transition-colors bg-green-500 hover:bg-green-700 active:bg-green-800"
                  onClick={() =>
                    setRibbon({ slices: props.ribbon.slices.reverse() })
                  }
                >
                  Reverse Direction
                </button>
                <Button onClick={() => handleAddTrapezoid({ top: true })}>
                  Add slice to top of ribbon
                </Button>
                <Button onClick={() => handleAddTrapezoid({ top: false })}>
                  Add slice to bottom of ribbon
                </Button>
                <Button onClick={handleDetectAgain}>Detect slices again</Button>
              </Show>
            </div>
            <label class="flex flex-row items-center gap-1">
              <input
                type="radio"
                name={radioName()}
                value="matching"
                checked={props.ribbon.status === "matching"}
                onChange={(e) => {
                  if (e.currentTarget.checked)
                    setRibbon({ status: "matching" });
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
      </Show>
      <Show when={props.ribbon.matchedPoints.length > 0}>
        <div class="flex items-center justify-center">
          <button
            class="text-white font-bold py-1 px-2 text-xs rounded transition-colors bg-green-600 hover:bg-green-700 active:bg-green-800"
            onClick={async () => {
              const brightness = await microscopeApi.getBrightness();
              const contrast = await microscopeApi.getContrast();
              const focus = await microscopeApi.getWorkingDistance();
              await microscopeApi.setMagnification(magnification());
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
                  payload: { brightness, contrast, focus },
                }
              );
            }}
          >
            Configure Slices
          </button>
        </div>
      </Show>
    </div>
  );
};
