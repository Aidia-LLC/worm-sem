import { createSignal } from "solid-js";
import {
  enqueueCommand,
  getNextCommandId,
} from "src/data/signals/commandQueue";

const DEFAULT_MAG = 40 * 1000;
const MAX_MAG = 70 * 1000;

export const MagnificationPicker = () => {
  const [magnification, setMagnification] = createSignal(DEFAULT_MAG);

  const handleChange = (value: number) => {
    setMagnification(value);
    enqueueCommand({
      id: getNextCommandId(),
      type: "setParam",
      param: "AP_MAG",
      value,
    });
  };
  
  return (
    <div class="flex flex-col gap-2">
      <span class="font-bold">Magnification</span>
      <div class="grid grid-cols-2 w-full gap-2">
        <input
          type="range"
          min="1"
          max={MAX_MAG}
          value={magnification()}
          onChange={(e) => handleChange(parseInt(e.currentTarget.value))}
        />
        <div class="flex flex-row items-center gap-2">
          <input
            type="number"
            min="1"
            max={MAX_MAG}
            class="w-full"
            value={magnification()}
            onChange={(e) => handleChange(parseInt(e.currentTarget.value))}
          />
          <span>x</span>
        </div>
      </div>
    </div>
  );
};
