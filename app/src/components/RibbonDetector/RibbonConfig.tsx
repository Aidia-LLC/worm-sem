import { addTrapezoid } from "@logic/trapezoids/addTrapezoid";
import { microscopeApi } from "@microscopeApi/index";
import { For, Show } from "solid-js";
import {
  magnificationSignal,
  nextSliceIdSignal,
  ribbonState,
} from "src/data/signals/globals";
import { RibbonData } from "@data/shapes";
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

  // const handleDetectAgain = () => {
  //   ribbonDispatch({
  //     action: "deleteRibbon",
  //     payload: props.ribbon,
  //   });
  //   const points = [...props.ribbon.clickedPoints];
  //   // move the first point to the end of the array
  //   points.push(points.shift()!);
  //   props.handleRibbonDetection(points);
  // };

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
        />
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
      </div>
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
          <div class="flex flex-col gap-2">
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
          </div>
          <label class="flex flex-row items-center gap-1">
            <input
              type="radio"
              name={radioName()}
              value="matching"
              checked={props.ribbon.status === "matching"}
              onChange={(e) => {
                if (e.currentTarget.checked) setRibbon({ status: "matching" });
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
          >
            Add slice to top
          </Button>
          <Button
            onClick={() => handleAddTrapezoid({ top: false })}
            class="w-full"
            variant="primary-outline"
          >
            Add slice to bottom
          </Button>
        </div>
        <div class="flex flex-col gap-1 items-center justify-evenly">
          <Button
            variant="ghost"
            onClick={() => setRibbon({ slices: props.ribbon.slices.reverse() })}
          >
            Reverse Direction
          </Button>
          {/* <Button
            onClick={handleDetectAgain}
            class="w-full"
            variant="secondary"
          >
            Detect slices again
          </Button> */}
        </div>
      </Show>
      <Show when={props.ribbon.matchedPoints.length > 0}>
        <div class="flex items-center justify-end">
          <Button
            tooltip="Configure brightness, contrast, and focus for each slice"
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
          </Button>
        </div>
      </Show>
    </div>
  );
};
