import { Button } from "@components/Button";
import { optionsStore, ribbonState } from "@data/globals";
import { Show } from "solid-js";

export const CornerValidation = (props: {
  edgeDataCanvasRef: () => HTMLCanvasElement;
  handleCornerValidation: (points: [number, number][]) => void;
  handleRibbonDetection: () => void;
}) => {
  const [ribbonReducer, ribbonDispatch] = ribbonState;
  const [options, setOptions] = optionsStore;
  return (
    <Show when={ribbonReducer().cornerValidation}>
      <div class="flex flex-col gap-2">
        <div class="flex flex-row items-center gap-2 mx-auto">
          <span class="text-lg whitespace-nowrap">
            There are currently {ribbonReducer().corners.length}{" "}
            {ribbonReducer().corners.length === 1 ? "corner" : "corners"}.{" "}
            {ribbonReducer().corners.length % 4 !== 0
              ? "Make sure there are 4 corners per slice!"
              : ""}
          </span>
        </div>
        <div class="flex flex-row items-center gap-2 mx-auto">
          <span class="text-lg whitespace-nowrap">
            Click {ribbonReducer().cornerPhase === "adjust" ? "and drag" : ""}{" "}
            to {ribbonReducer().cornerPhase} points
          </span>
          {/* toggle corner validation phase */}
          <div class="flex flex-col gap-2 justify-between my-auto">
            <label class="font-bold">Status</label>
            <div class="flex flex-col gap-2 justify-between mb-2.5">
              <label class="flex flex-row items-center gap-1">
                <input
                  type="radio"
                  value="Delete"
                  checked={ribbonReducer().cornerPhase === "delete"}
                  onChange={(e) => {
                    if (e.currentTarget.checked)
                      ribbonDispatch({
                        action: "setCornerPhase",
                        payload: "delete",
                      });
                  }}
                />
                Delete
              </label>
              <label class="flex flex-row items-center gap-1">
                <input
                  type="radio"
                  value="add"
                  checked={ribbonReducer().cornerPhase === "add"}
                  onChange={(e) => {
                    if (e.currentTarget.checked)
                      ribbonDispatch({
                        action: "setCornerPhase",
                        payload: "add",
                      });
                  }}
                />
                Add
              </label>
              <label class="flex flex-row items-center gap-1">
                <input
                  type="radio"
                  value="adjust"
                  checked={ribbonReducer().cornerPhase === "adjust"}
                  onChange={(e) => {
                    if (e.currentTarget.checked)
                      ribbonDispatch({
                        action: "setCornerPhase",
                        payload: "adjust",
                      });
                  }}
                />
                Adjust
              </label>
            </div>
          </div>
          <input
            value={options.options.sensitivity.toString()}
            type="number"
            onChange={(e) =>
              setOptions({
                options: {
                  ...options.options,
                  sensitivity: e.currentTarget.valueAsNumber,
                },
              })
            }
          />
          <input
            value={options.options.sensitivity.toString()}
            type="range"
            min="1"
            max="10"
            step=".1"
            onChange={(e) => {
              setOptions({
                options: {
                  ...options.options,
                  sensitivity: parseFloat(e.currentTarget.value),
                },
              });
            }}
          />
          <Button
            onClick={() => {
              props.handleRibbonDetection();
            }}
            class="whitespace-nowrap"
            variant="primary-outline"
          >
            Set Sensitivity
          </Button>
          <Button
            onClick={() => {
              ribbonDispatch({
                action: "setCornerValidation",
                payload: false,
              });
              props.handleCornerValidation(ribbonReducer().corners);
            }}
            class="whitespace-nowrap"
            variant="primary-outline"
          >
            Done
          </Button>
        </div>
      </div>
    </Show>
  );
};
