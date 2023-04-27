import { GetParamCommand, GrabFullFrameCommand, Param } from "@dto/semClient";
import { getNextCommandId } from "./signals/commandQueue";

export const getSEMParam = (param: Param): Promise<string> => {
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

export const FASTEST_SCAN_SPEED = 0;
export const MEDIUM_SCAN_SPEED = 5;
export const SLOWEST_SCAN_SPEED = 15;

export const LOWER_IMAGE_QUALITY = 0;
export const MEDIUM_IMAGE_QUALITY = 7;
export const HIGHEST_IMAGE_QUALITY = 11;
