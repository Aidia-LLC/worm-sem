import { createSignal } from "solid-js";
import { createOptionsStore } from "../createOptionsStore";

export const DEFAULT_MAG = 4500;
const DEFAULT_SCAN_SPEED = 7;
export const MAX_MAG = 6000;

export const optionsStore = createOptionsStore();
export const optionsSequenceSignal = createSignal(0);
export const magnificationSignal = createSignal(DEFAULT_MAG);
export const scanSpeedSignal = createSignal(DEFAULT_SCAN_SPEED);
