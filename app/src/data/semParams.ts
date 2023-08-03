import { GrabFullFrameCommand } from "src/microscopeApi/types";

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

export const FASTEST_SCAN_SPEED = 5;
export const MEDIUM_SCAN_SPEED = 3;
export const SLOWEST_SCAN_SPEED = 7;

export const LOWER_IMAGE_QUALITY = 4;
export const HIGHEST_IMAGE_QUALITY = 7;
