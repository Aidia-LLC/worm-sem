import { Button } from "./Button";
import { Trapezoid, Vertex } from "./Canvas";

export enum Status {
  Editing,
  Matching,
  Saved,
}

export type TrapezoidSet = {
  trapezoids: Trapezoid[];
  id: number;
  color: string;
  thickness: number;
  status: Status;
  matchedPoints: Vertex[];
};

export const availableColors = ["red", "blue", "green", "yellow", "purple", "orange"];

export const TrapezoidSetConfig = (props: {
  trapezoidSet: Pick<TrapezoidSet, "id" | "color" | "thickness" | "status">;
  setTrapezoidSet: (trapezoidSet: Partial<TrapezoidSet>) => void;
  onDelete: (trapezoid: Pick<TrapezoidSet, "id">) => void;
}) => {
  const radioName = () => `status-${props.trapezoidSet.id}`;

  return (
    <div class="grid grid-cols-8 gap-3 border-2 p-2 rounded-md pr-4">
      <div class="flex flex-col gap-1 items-center justify-center font-bold text-lg">
        <span>Set #{props.trapezoidSet.id}</span>
        <button class='text-white font-bold py-1 px-2 text-xs rounded transition-colors bg-red-500 hover:bg-red-700 active:bg-red-800' onClick={() => props.onDelete(props.trapezoidSet)}>
          Remove
        </button>
      </div>
      <div class="flex flex-col gap-2 col-span-2">
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
      <div class="flex flex-col gap-2 col-span-2">
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
      <div class="flex flex-col gap-2 justify-between col-span-3">
        <label class="font-bold">Status</label>
        <div class="flex flex-row gap-2 justify-between mb-2.5">
          <label class="flex flex-row items-center gap-1">
            <input
              type="radio"
              name={radioName()}
              value="editing"
              checked={props.trapezoidSet.status === Status.Editing}
              onChange={(e) => {
                if (e.currentTarget.checked)
                  props.setTrapezoidSet({
                    id: props.trapezoidSet.id,
                    status: Status.Editing,
                  });
              }}
            />
            Editing
          </label>
          <label class="flex flex-row items-center gap-1">
            <input
              type="radio"
              name={radioName()}
              value="matching"
              checked={props.trapezoidSet.status === Status.Matching}
              onChange={(e) => {
                if (e.currentTarget.checked)
                  props.setTrapezoidSet({
                    id: props.trapezoidSet.id,
                    status: Status.Matching,
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
              checked={props.trapezoidSet.status === Status.Saved}
              onChange={(e) => {
                if (e.currentTarget.checked)
                  props.setTrapezoidSet({
                    id: props.trapezoidSet.id,
                    status: Status.Saved,
                  });
              }}
            />
            Saved
          </label>
        </div>
      </div>
    </div>
  );
};
