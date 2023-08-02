import {
  GetParamCommand,
  GrabFullFrameCommand,
  ZeissParam,
} from "src/microscopeApi/types";
import { sleep } from "../logic/handleFinalImaging";
import { getNextCommandId } from "./signals/commandQueue";

export const getSEMParam = (param: ZeissParam): Promise<string> => {
  return new Promise((resolve, reject) => {
    const command: GetParamCommand = {
      id: getNextCommandId(),
      type: "getParam",
      param,
    };
    const unsubscribe = window.semClient.subscribe((message) => {
      if (message.id === command.id) {
        if (message.type === "success") {
          unsubscribe();
          const [_, value] = message.payload!.split("=");
          resolve(value);
        } else {
          reject();
        }
      }
    });
    window.semClient.send(command);
  });
};

export const grabSEMImage = (command: GrabFullFrameCommand): Promise<void> => {
  return new Promise((resolve, reject) => {
    const unsubscribe = window.semClient.subscribe((message) => {
      if (message.id === command.id) {
        unsubscribe();
        if (message.type === "success") {
          resolve();
        } else {
          reject(new Error(message.message));
        }
      }
    });
    window.semClient.send(command);
  });
};

export const grabSEMImageOnFrameEnd = async (
  command: GrabFullFrameCommand,
  options?: { minSleepMs?: number; pollIntervalMs?: number }
): Promise<void> => {
  window.semClient.send({
    id: getNextCommandId(),
    type: "setParam",
    param: "DP_FROZEN",
    doubleValue: 0, // not frozen
  });
  await sleep(500);
  window.semClient.send({
    id: getNextCommandId(),
    type: "setParam",
    param: "DP_FREEZE_ON",
    doubleValue: 0, // freeze on end frame
  });
  await sleep(2000);
  window.semClient.send({
    id: getNextCommandId(),
    type: "setParam",
    param: "DP_FROZEN",
    doubleValue: 1, // not frozen
  });
  await sleep(options?.minSleepMs || 10000);
  while (true) {
    const isFrozen = await getSEMParam("DP_FROZEN");
    if (isFrozen === "1") break;
    await sleep(options?.pollIntervalMs || 10000);
  }
  return grabSEMImage(command);
};

export const FASTEST_SCAN_SPEED = 5;
export const MEDIUM_SCAN_SPEED = 3;
export const SLOWEST_SCAN_SPEED = 7;

export const LOWER_IMAGE_QUALITY = 4;
export const HIGHEST_IMAGE_QUALITY = 7;


