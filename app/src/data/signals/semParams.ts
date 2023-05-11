import { Param } from "src/types/semClient";
import { createSignal } from "solid-js";

export const semParamsSignal = createSignal(new Map<Param, any>());
