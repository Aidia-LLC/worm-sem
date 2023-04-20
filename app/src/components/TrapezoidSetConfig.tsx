import { TrapezoidSet } from "@dto/canvas";
import { Show } from "solid-js";

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
}) => {
  const radioName = () => `status-${props.trapezoidSet.id}`;

  const toggleGrabbing = () => {
    if (props.grabbing) props.onGrab(null);
    else props.onGrab(props.trapezoidSet.id);
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
          class="w-full"
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
      <Show when={!props.grabbing}>
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
              Locked
            </label>
          </div>
        </div>
      </Show>
      <Show when={props.trapezoidSet.matchedPoints.length > 0}>
        <Show when={!props.grabbing} fallback="Grabbing...">
          <div class="flex items-center justify-center">
            <button
              class="text-white font-bold py-1 px-2 text-xs rounded transition-colors bg-green-600 hover:bg-green-700 active:bg-green-800"
              onClick={toggleGrabbing}
            >
              Configure Slices
            </button>
          </div>
        </Show>
      </Show>
    </div>
  );
};
