import { Param } from "@dto/semClient";
import { createSignal } from "solid-js";

export const semParamsSignal = createSignal(new Map<Param, any>());
