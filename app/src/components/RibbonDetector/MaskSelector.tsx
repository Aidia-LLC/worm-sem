import { edgeFilter } from "@logic/edgeFilter";
import { Show } from "solid-js";
import { ribbonState } from "src/data/signals/globals";
import { Button } from "../Button";

export const MaskSelector = (props: {
  edgeDataCanvasRef: () => HTMLCanvasElement;
  handleRibbonDetection: (points: [number, number][]) => void;
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
            const [mask] = ribbonReducer().masks;
            const points = ribbonReducer().clickedPoints;
            ribbonDispatch(
              {
                action: "setMasks",
                payload: [],
              },
              {
                action: "setClickedPoints",
                payload: [],
              }
            );
            const edgeContext = props.edgeDataCanvasRef().getContext("2d")!;
            edgeContext.clearRect(
              0,
              0,
              props.edgeDataCanvasRef().width,
              props.edgeDataCanvasRef().height
            );
            const edgeData = edgeFilter(
              props.edgeDataCanvasRef(),
              mask,
              edgeContext
            );
            edgeContext.putImageData(edgeData, 0, 0);
            props.handleRibbonDetection(points);
          }}
          class="whitespace-nowrap"
        >
          Accept Mask
        </Button>
      </div>
    </Show>
  );
};
