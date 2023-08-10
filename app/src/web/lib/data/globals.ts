import { ZoomState } from "@components/RibbonDetector/ZoomController";
import {
  DEFAULT_MAGNIFICATION,
  DEFAULT_SCAN_SPEED,
  DEFAULT_ZOOM_SCALE,
} from "@config";
import { createReducer } from "@solid-primitives/reducer";
import { StageConfiguration } from "@utils/computeStageCoordinates";
import { createSignal } from "solid-js";
import {
  ribbonDispatcher,
  RibbonDispatchPayload,
  ribbonReducerInitialState,
  RibbonReducerState,
} from "./ribbonReducer";
import { createOptionsStore } from "./options";

export const optionsStore = createOptionsStore();
export const optionsSequenceSignal = createSignal(0);
export const magnificationSignal = createSignal(DEFAULT_MAGNIFICATION);
export const scanSpeedSignal = createSignal(DEFAULT_SCAN_SPEED);
export const previewScanSpeedSignal = createSignal(DEFAULT_SCAN_SPEED);

export const zoomStateSignal = createSignal<ZoomState>({
  status: "zoomed-out",
  scale: 1,
});
export const defaultZoomScaleSignal = createSignal(DEFAULT_ZOOM_SCALE);

export const primaryImageSignal = createSignal<{
  src: string;
  filename: string;
  size?: {
    width: number;
    height: number;
  };
} | null>(null);

export const initialStageSignal = createSignal<StageConfiguration | null>(null);

export const ribbonState = createReducer<
  RibbonReducerState,
  RibbonDispatchPayload[]
>(ribbonDispatcher, ribbonReducerInitialState);
export const showOriginalImageSignal = createSignal(true);
export const nextRibbonIdSignal = createSignal(1);
export const nextSliceIdSignal = createSignal(1);
