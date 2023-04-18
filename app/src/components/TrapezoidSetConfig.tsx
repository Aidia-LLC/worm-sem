import { TrapezoidSet } from "@dto/canvas";
import { GrabCommand } from "@dto/semClient";
import { convertCoordinatesForSEM } from "@logic/trapezoids/conversion";
import { createSignal, Show } from "solid-js";
import {
  enqueueCommand,
  getNextCommandId,
} from "src/data/signals/commandQueue";
import { ReductionPicker } from "./ReductionPicker";

export const availableColors = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
];

export const TrapezoidSetConfig = (props: {
  trapezoidSet: TrapezoidSet;
  setTrapezoidSet: (
    trapezoidSet: Pick<TrapezoidSet, "id"> & Partial<TrapezoidSet>
  ) => void;
  onDelete: (trapezoid: Pick<TrapezoidSet, "id">) => void;
  canvasSize: { width: number; height: number };
  onGrab: (id: TrapezoidSet["id"] | null) => void;
  grabbing: boolean;
  onSetBoxSize: (size: number) => void;
  boxSize: number;
}) => {
  const [reduction, setReduction] = createSignal(-1);
  const radioName = () => `status-${props.trapezoidSet.id}`;

  const toggleGrabbing = () => {
    if (props.grabbing) props.onGrab(null);
    else props.onGrab(props.trapezoidSet.id);
  };

  const onSend = () => {
    const points = props.trapezoidSet.matchedPoints.map((point) =>
      convertCoordinatesForSEM(point, props.canvasSize)
    );
    const { x: boxWidth, y: boxHeight } = convertCoordinatesForSEM(
      { x: props.boxSize, y: props.boxSize },
      props.canvasSize
    );

    const boxes = points.map((point) => ({
      x: point.x - boxWidth / 2,
      y: point.y - boxHeight / 2,
      width: boxWidth,
      height: boxHeight,
    }));
    const setId = getNextCommandId();
    const prefix = props.trapezoidSet.name.trim().replace(/[^a-zA-Z0-9]/g, "-");
    const commands: GrabCommand[] = boxes.map((box, i) => ({
      id: getNextCommandId(),
      setId,
      type: "grab",
      height: Math.round(box.height),
      width: Math.round(box.width),
      x: Math.round(box.x),
      y: Math.round(box.y),
      name: `${prefix}-${i + 1}`,
      reduction: reduction(),
    }));
    for (const command of commands) enqueueCommand(command);
    toggleGrabbing();
  };

  return (
    <div
      class="grid grid-cols-9 gap-3 border-2 p-2 rounded-md pr-4 bg-opacity-40"
      classList={{
        "bg-red-300": props.trapezoidSet.color === "red",
        "bg-blue-300": props.trapezoidSet.color === "blue",
        "bg-green-300": props.trapezoidSet.color === "green",
        "bg-yellow-300": props.trapezoidSet.color === "yellow",
        "bg-purple-300": props.trapezoidSet.color === "purple",
        "bg-orange-300": props.trapezoidSet.color === "orange",
      }}
    >
      <div class="flex flex-col gap-1 items-center justify-center font-bold text-lg">
        <input
          class='w-full'
          type="text"
          value={props.trapezoidSet.name}
          onChange={(e) =>
            props.setTrapezoidSet({
              id: props.trapezoidSet.id,
              name: e.currentTarget.value,
            })
          }
        />
        <button
          class="text-white font-bold py-1 px-2 text-xs rounded transition-colors bg-red-500 hover:bg-red-700 active:bg-red-800"
          onClick={() => props.onDelete(props.trapezoidSet)}
        >
          Remove
        </button>
      </div>
      <Show
        when={!props.grabbing}
        fallback={
          <>
            <div class="flex flex-col gap-1 col-span-2 my-auto">
              <label class="font-bold">Box Size</label>
              <input
                type="number"
                value={props.boxSize}
                class="p-2 rounded-md border border-gray-300"
                onInput={(e) =>
                  props.onSetBoxSize(parseInt(e.currentTarget.value) || 1)
                }
                min={1}
              />
            </div>
          </>
        }
      >
        <div class="flex flex-col gap-1 col-span-2 my-auto">
          <label class="font-bold">Color</label>
          <select
            class="p-2 rounded-md border border-gray-300"
            value={props.trapezoidSet.color}
            onChange={(e) => {
              props.setTrapezoidSet({
                id: props.trapezoidSet.id,
                color: e.currentTarget.value,
              });
            }}
          >
            {availableColors.map((color) => (
              <option value={color}>{color}</option>
            ))}
          </select>
        </div>
        <div class="flex flex-col gap-1 col-span-2 my-auto">
          <label class="font-bold">Thickness</label>
          <input
            min={1}
            type="number"
            value={props.trapezoidSet.thickness}
            class="p-2 rounded-md border border-gray-300"
            onChange={(e) => {
              props.setTrapezoidSet({
                id: props.trapezoidSet.id,
                thickness: parseInt(e.currentTarget.value),
              });
            }}
          />
        </div>
        <div
          class="flex flex-col gap-2 justify-between my-auto"
          classList={{
            "col-span-4": props.trapezoidSet.matchedPoints.length === 0,
            "col-span-3": props.trapezoidSet.matchedPoints.length > 0,
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
                  checked={props.trapezoidSet.status === "editing"}
                  onChange={(e) => {
                    if (e.currentTarget.checked)
                      props.setTrapezoidSet({
                        id: props.trapezoidSet.id,
                        status: "editing",
                      });
                  }}
                />
                Editing
              </label>
              <Show when={props.trapezoidSet.status === "editing"}>
                <button
                  class="text-white font-bold py-1 px-2 text-xs rounded transition-colors bg-green-500 hover:bg-green-700 active:bg-green-800"
                  onClick={() =>
                    props.setTrapezoidSet({
                      id: props.trapezoidSet.id,
                      trapezoids: props.trapezoidSet.trapezoids.reverse(),
                    })
                  }
                >
                  Reverse Direction
                </button>
              </Show>
            </div>
            <label class="flex flex-row items-center gap-1">
              <input
                type="radio"
                name={radioName()}
                value="matching"
                checked={props.trapezoidSet.status === "matching"}
                onChange={(e) => {
                  if (e.currentTarget.checked)
                    props.setTrapezoidSet({
                      id: props.trapezoidSet.id,
                      status: "matching",
                    });
                }}
              />
              Matching
            </label>
            <label class="flex flex-row items-center gap-1">
              <input
                type="radio"
                name={radioName()}
                value="saved"
                checked={props.trapezoidSet.status === "saved"}
                onChange={(e) => {
                  if (e.currentTarget.checked)
                    props.setTrapezoidSet({
                      id: props.trapezoidSet.id,
                      status: "saved",
                    });
                }}
              />
              Saved
            </label>
          </div>
        </div>
      </Show>
      <Show when={props.trapezoidSet.matchedPoints.length > 0}>
        <Show
          when={props.grabbing}
          fallback={
            <div class="flex items-center justify-center">
              <button
                class="text-white font-bold py-1 px-2 text-xs rounded transition-colors bg-green-600 hover:bg-green-700 active:bg-green-800"
                onClick={toggleGrabbing}
              >
                Grab
              </button>
            </div>
          }
        >
          <div class="col-span-2">
            <ReductionPicker value={reduction()} onChange={setReduction} />
          </div>
          <div class="flex items-center justify-center">
            <button
              class="text-white font-bold py-1 px-2 text-xs rounded transition-colors bg-gray-600 hover:bg-gray-700 active:bg-gray-800"
              onClick={toggleGrabbing}
            >
              Cancel
            </button>
          </div>
          <div class="flex items-center justify-center">
            <button
              class="text-white font-bold py-1 px-2 text-xs rounded transition-colors bg-green-600 hover:bg-green-700 active:bg-green-800"
              onClick={onSend}
            >
              Send
            </button>
          </div>
        </Show>
      </Show>
    </div>
  );
};
