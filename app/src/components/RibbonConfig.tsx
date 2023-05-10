import { Trapezoid, RibbonData } from "@dto/canvas";
import { Show } from "solid-js";
import { Button } from "./Button";

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
  setTrapezoidSet: (
    trapezoidSet: Pick<RibbonData, "id"> & Partial<RibbonData>
  ) => void;
  onDelete: (trapezoid: Pick<RibbonData, "id">) => void;
  canvasSize: { width: number; height: number };
  onGrab: (id: RibbonData["id"] | null) => void;
  grabbing: boolean;
  ctx: any;
}) => {
  const radioName = () => `status-${props.ribbon.id}`;

  const toggleGrabbing = () => {
    if (props.grabbing) props.onGrab(null);
    else props.onGrab(props.ribbon.id);
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
          onChange={(e) =>
            props.setTrapezoidSet({
              id: props.ribbon.id,
              name: e.currentTarget.value,
            })
          }
        />
        <Show when={!props.grabbing}>
          <button
            class="text-white font-bold py-1 px-2 text-xs rounded transition-colors bg-red-500 hover:bg-red-700 active:bg-red-800"
            onClick={() => props.onDelete(props.ribbon)}
          >
            Remove
          </button>
        </Show>
      </div>
      <Show
        when={!props.grabbing && props.ribbon.phase === 2}
        fallback={
          <>
            <h2>Confirm Initial Trapezoid is good</h2>
            <button
              class="text-white font-bold py-1 px-2 text-xs rounded transition-colors bg-green-500 hover:bg-green-700 active:bg-green-800"
              onClick={() => {
                props.setTrapezoidSet({
                  ...props.ribbon,
                  phase: 2,
                });
              }}
            >
              Confirm
            </button>
          </>
        }
      >
        <div class="flex flex-col gap-1 col-span-2 my-auto">
          <label class="font-bold">Color</label>
          <select
            class="p-2 rounded-md border border-gray-300"
            value={props.ribbon.color}
            onChange={(e) => {
              props.setTrapezoidSet({
                id: props.ribbon.id,
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
                      props.setTrapezoidSet({
                        id: props.ribbon.id,
                        status: "editing",
                      });
                  }}
                />
                Editing
              </label>
              <Show when={props.ribbon.status === "editing"}>
                <button
                  class="text-white font-bold py-1 px-2 text-xs rounded transition-colors bg-green-500 hover:bg-green-700 active:bg-green-800"
                  onClick={() =>
                    props.setTrapezoidSet({
                      id: props.ribbon.id,
                      trapezoids: props.ribbon.trapezoids.reverse(),
                    })
                  }
                >
                  Reverse Direction
                </button>
                <Button
                  onClick={() => {
                    const newSet = addTrapezoid(
                      props.ribbon.trapezoids,
                      true,
                      // props.ctx
                    );
                    props.setTrapezoidSet({
                      ...props.ribbon,
                      trapezoids: newSet,
                    });
                  }}
                >
                  Add slice to top of ribbon
                </Button>
                <Button
                  onClick={() => {
                    const newSet = addTrapezoid(
                      props.ribbon.trapezoids,
                      false,
                      // props.ctx
                    );
                    props.setTrapezoidSet({
                      ...props.ribbon,
                      trapezoids: newSet,
                    });
                  }}
                >
                  Add slice to bottom of ribbon
                </Button>
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
                    props.setTrapezoidSet({
                      id: props.ribbon.id,
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
                checked={props.ribbon.status === "saved"}
                onChange={(e) => {
                  if (e.currentTarget.checked)
                    props.setTrapezoidSet({
                      id: props.ribbon.id,
                      status: "saved",
                    });
                }}
              />
              Locked
            </label>
          </div>
        </div>
      </Show>
      <Show when={props.ribbon.matchedPoints.length > 0}>
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

const addTrapezoid = (
  trapezoids: RibbonData["trapezoids"],
  top = false,
  // ctx: any
) => {
  // insert and identical trapezoid to either the beginning or end of the array
  const newTrapezoidSet = [...trapezoids];
  if (top) {
    const newTrapezoid = trapezoids[0];
    const referenceTrapezoid = trapezoids[1];
    const topTrapezoid: Trapezoid = {
      top: {
        x1:
          newTrapezoid.top.x1 +
          (newTrapezoid.top.x1 - referenceTrapezoid.top.x1),
        x2:
          newTrapezoid.top.x2 +
          (newTrapezoid.top.x2 - referenceTrapezoid.top.x2),
        y1:
          newTrapezoid.top.y1 +
          (newTrapezoid.top.y1 - referenceTrapezoid.top.y1),
        y2:
          newTrapezoid.top.y2 +
          (newTrapezoid.top.y2 - referenceTrapezoid.top.y2),
      },
      bottom: {
        x1:
          newTrapezoid.bottom.x1 +
          (newTrapezoid.bottom.x1 - referenceTrapezoid.bottom.x1),
        x2:
          newTrapezoid.bottom.x2 +
          (newTrapezoid.bottom.x2 - referenceTrapezoid.bottom.x2),
        y1:
          newTrapezoid.bottom.y1 +
          (newTrapezoid.bottom.y1 - referenceTrapezoid.bottom.y1),
        y2:
          newTrapezoid.bottom.y2 +
          (newTrapezoid.bottom.y2 - referenceTrapezoid.bottom.y2),
      },
      left: {
        x1:
          newTrapezoid.left.x1 +
          (newTrapezoid.left.x1 - referenceTrapezoid.left.x1),
        x2:
          newTrapezoid.left.x2 +
          (newTrapezoid.left.x2 - referenceTrapezoid.left.x2),
        y1:
          newTrapezoid.left.y1 +
          (newTrapezoid.left.y1 - referenceTrapezoid.left.y1),
        y2:
          newTrapezoid.left.y2 +
          (newTrapezoid.left.y2 - referenceTrapezoid.left.y2),
      },
      right: {
        x1:
          newTrapezoid.right.x1 +
          (newTrapezoid.right.x1 - referenceTrapezoid.right.x1),
        x2:
          newTrapezoid.right.x2 +
          (newTrapezoid.right.x2 - referenceTrapezoid.right.x2),
        y1:
          newTrapezoid.right.y1 +
          (newTrapezoid.right.y1 - referenceTrapezoid.right.y1),
        y2:
          newTrapezoid.right.y2 +
          (newTrapezoid.right.y2 - referenceTrapezoid.right.y2),
      },
    };
    newTrapezoidSet.unshift(topTrapezoid);
  } else {
    const newTrapezoid = trapezoids[trapezoids.length - 1];
    const referenceTrapezoid = trapezoids[trapezoids.length - 2];
    const bottomTrapezoid: Trapezoid = {
      top: {
        x1:
          newTrapezoid.top.x1 +
          (newTrapezoid.top.x1 - referenceTrapezoid.top.x1),
        x2:
          newTrapezoid.top.x2 +
          (newTrapezoid.top.x2 - referenceTrapezoid.top.x2),
        y1:
          newTrapezoid.top.y1 +
          (newTrapezoid.top.y1 - referenceTrapezoid.top.y1),
        y2:
          newTrapezoid.top.y2 +
          (newTrapezoid.top.y2 - referenceTrapezoid.top.y2),
      },
      bottom: {
        x1:
          newTrapezoid.bottom.x1 +
          (newTrapezoid.bottom.x1 - referenceTrapezoid.bottom.x1),
        x2:
          newTrapezoid.bottom.x2 +
          (newTrapezoid.bottom.x2 - referenceTrapezoid.bottom.x2),
        y1:
          newTrapezoid.bottom.y1 +
          (newTrapezoid.bottom.y1 - referenceTrapezoid.bottom.y1),
        y2:
          newTrapezoid.bottom.y2 +
          (newTrapezoid.bottom.y2 - referenceTrapezoid.bottom.y2),
      },
      left: {
        x1:
          newTrapezoid.left.x1 +
          (newTrapezoid.left.x1 - referenceTrapezoid.left.x1),
        x2:
          newTrapezoid.left.x2 +
          (newTrapezoid.left.x2 - referenceTrapezoid.left.x2),
        y1:
          newTrapezoid.left.y1 +
          (newTrapezoid.left.y1 - referenceTrapezoid.left.y1),
        y2:
          newTrapezoid.left.y2 +
          (newTrapezoid.left.y2 - referenceTrapezoid.left.y2),
      },
      right: {
        x1:
          newTrapezoid.right.x1 +
          (newTrapezoid.right.x1 - referenceTrapezoid.right.x1),
        x2:
          newTrapezoid.right.x2 +
          (newTrapezoid.right.x2 - referenceTrapezoid.right.x2),
        y1:
          newTrapezoid.right.y1 +
          (newTrapezoid.right.y1 - referenceTrapezoid.right.y1),
        y2:
          newTrapezoid.right.y2 +
          (newTrapezoid.right.y2 - referenceTrapezoid.right.y2),
      },
    };
    newTrapezoidSet.push(bottomTrapezoid);
  }
  return newTrapezoidSet;
};
