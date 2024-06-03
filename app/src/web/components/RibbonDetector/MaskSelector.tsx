import { ribbonState } from "@data/globals";
import { Show } from "solid-js";
import { Button } from "../Button";

export const MaskSelector = (props: {
  edgeDataCanvasRef: () => HTMLCanvasElement;
  handleRibbonDetection: (
    points: [number, number][],
    clickedPointIndex: number
  ) => void;
}) => {
  const [ribbonReducer, ribbonDispatch] = ribbonState;

  return (
    <Show when={ribbonReducer().masks.length > 1}>
      <div class="flex flex-row items-center gap-2 mx-auto">
        <span class="text-lg whitespace-nowrap">
          Mask {ribbonReducer().currentMaskIndex + 1} /{" "}
          {ribbonReducer().masks.length}
        </span>
        <Button
          onClick={() => {
            const prev = ribbonReducer().masks;
            if (prev.length === 0) return;
            ribbonDispatch({
              action: "changeMask",
              payload: "previous",
            });
          }}
          class="whitespace-nowrap"
          variant="primary-outline"
        >
          Previous mask
        </Button>
        <Button
          onClick={() => {
            const prev = ribbonReducer().masks;
            if (prev.length === 0) return;
            ribbonDispatch({
              action: "changeMask",
              payload: "next",
            });
          }}
          class="whitespace-nowrap"
          variant="primary-outline"
        >
          Next mask
        </Button>
        <Button
          onClick={() => {
            const mask =
              ribbonReducer().masks[ribbonReducer().currentMaskIndex];
            if (!mask) return;
            const points = ribbonReducer().referencePoints;
            ribbonDispatch(
              { action: "setMasks", payload: [] },
              { action: "setReferencePoints", payload: [] }
            );
            props.handleRibbonDetection(points, 0);
          }}
          class="whitespace-nowrap"
        >
          Accept Mask
        </Button>
      </div>
    </Show>
  );
};
