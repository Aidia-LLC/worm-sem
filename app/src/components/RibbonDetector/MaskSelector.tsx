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
      <Button
        onClick={() => {
          const prev = ribbonReducer().masks;
          if (prev.length === 0) return;
          const last = prev[prev.length - 1];
          ribbonDispatch({
            action: "setMasks",
            payload: [last, ...prev.slice(0, -1)],
          });
        }}
      >
        Previous mask
      </Button>
      <Button
        onClick={() => {
          const prev = ribbonReducer().masks;
          if (prev.length === 0) return;
          const [mask, ...rest] = prev;
          ribbonDispatch({
            action: "setMasks",
            payload: [...rest, mask],
          });
        }}
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
      >
        Accept Mask
      </Button>
    </Show>
  );
};
