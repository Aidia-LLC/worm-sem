import { SliderPicker } from "@components/SliderPicker";
import { defaultZoomScaleSignal, zoomStateSignal } from "@data/globals";
import { Show } from "solid-js";

export const ZoomSlider = () => {
  const [zoomState, setZoomState] = zoomStateSignal;
  const [_, setDefaultZoomScale] = defaultZoomScaleSignal;

  return (
    <Show when={zoomState().status === "zoomed-in"}>
      <SliderPicker
        label="Zoom"
        value={zoomState().scale}
        setValue={(scale) => {
          const zoom = zoomState();
          if (zoom.status !== "zoomed-in") return;
          setZoomState({ ...zoom, scale });
          setDefaultZoomScale(scale);
        }}
        unit="x"
        max={15}
        min={1}
        step={1}
      />
    </Show>
  );
};
