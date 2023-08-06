import { Match, onCleanup, onMount, Switch } from "solid-js";
import { zoomStateSignal } from "src/data/signals/globals";
import { Button } from "../Button";

export const DEFAULT_ZOOM_SCALE = 10;

export type ZoomState =
  | {
      status: "zoomed-in";
      x: number;
      y: number;
      scale: number;
    }
  | {
      status: "zoomed-out";
      scale: 1;
    }
  | {
      status: "picking-center";
      scale: 1;
    };

export const ZoomController = () => {
  const [zoomState, setZoomState] = zoomStateSignal;

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === "z") handleZoomButtonPressed();
  };

  const handleZoomButtonPressed = () => {
    if (zoomState().status === "zoomed-out")
      setZoomState({ status: "picking-center", scale: 1 });
    else setZoomState({ status: "zoomed-out", scale: 1 });
  };

  onMount(async () => {
    window.addEventListener("keydown", handleKeyPress);
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyPress);
  });

  return (
    <Button onClick={handleZoomButtonPressed} variant="primary-outline">
      <Switch>
        <Match when={zoomState().status === "picking-center"}>
          Click on image to zoom
        </Match>
        <Match when={zoomState().status === "zoomed-in"}>Zoom Out</Match>
        <Match when={zoomState().status === "zoomed-out"}>Zoom In</Match>
      </Switch>
    </Button>
  );
};
