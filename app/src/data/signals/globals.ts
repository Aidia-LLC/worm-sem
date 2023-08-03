import { ZoomState } from "@components/ZoomController";
import { StageConfiguration } from "@logic/semCoordinates";
import { createReducer } from "@solid-primitives/reducer";
import { createSignal } from "solid-js";
import { createOptionsStore } from "../createOptionsStore";
import {
  ribbonDispatcher,
  ribbonReducerInitialState,
  RibbonReducerState,
} from "../ribbonReducer";

export const DEFAULT_MAG = 4500;
const DEFAULT_SCAN_SPEED = 7;
export const MAX_MAG = 6000;

export const optionsStore = createOptionsStore();
export const optionsSequenceSignal = createSignal(0);
export const magnificationSignal = createSignal(DEFAULT_MAG);
export const scanSpeedSignal = createSignal(DEFAULT_SCAN_SPEED);

export const zoomStateSignal = createSignal<ZoomState>({
  status: "zoomed-out",
  scale: 1,
});

export const imageSrcSignal = createSignal<string | null>(null);
export const imageSrcFilenameSignal = createSignal<string | null>(null);

export const initialStageSignal = createSignal<StageConfiguration | null>(null);

export const ribbonState = createReducer<RibbonReducerState, any[]>(
  ribbonDispatcher,
  ribbonReducerInitialState
);
