import { z } from "zod";
import { MicroscopeApi } from "./MicroscopeApi";
import { getSEMParam, grabSEMImage, setSEMParam } from "./semBridge";
import { ConnectCommand } from "./types";

export const microscopeApi: MicroscopeApi = {
  connect: async () => {
    return new Promise((resolve, reject) => {
      const command: ConnectCommand = {
        id: 1,
        type: "CONNECT",
      };
      const unsubscribe = window.semClient.subscribe((message) => {
        if (message.id === command.id) {
          unsubscribe();
          if (message.type === "SUCCESS") {
            resolve();
          } else {
            reject();
          }
        }
      });
      window.semClient.send(command);
    });
  },
  getMagnification: async () => {
    const param = await getSEMParam("MAGNIFICATION");
    return parseFloat(param);
  },
  setMagnification: async (magnification) => {
    await setSEMParam("MAGNIFICATION", magnification);
  },
  getBrightness: async () => {
    const param = await getSEMParam("BRIGHTNESS");
    return parseFloat(param);
  },
  setBrightness: async (brightness) => {
    await setSEMParam("BRIGHTNESS", brightness);
  },
  getContrast: async () => {
    const param = await getSEMParam("CONTRAST");
    return parseFloat(param);
  },
  setContrast: async (contrast) => {
    await setSEMParam("CONTRAST", contrast);
  },
  setScanSpeed: async (scanSpeed) => {
    const speed = z.number().int().min(1).max(10).parse(scanSpeed);
    await setSEMParam("SCAN_SPEED", speed);
  },
  getWorkingDistance: async () => {
    const param = await getSEMParam("WORKING_DISTANCE");
    return parseFloat(param);
  },
  setWorkingDistance: async (wd) => {
    await setSEMParam("WORKING_DISTANCE", wd);
  },
  setDetectorType: async (detectorType) => {
    await setSEMParam("DETECTOR_TYPE", detectorType);
  },
  setImageQuality: async (imageQuality) => {
    await setSEMParam("IMAGE_QUALITY", imageQuality);
  },
  moveStageTo: async ({ x, y }) => {
    await setSEMParam("STAGE_POSITION", { x, y });
  },
  getStagePosition: async () => {
    const position = await getSEMParam("STAGE_POSITION");
    return z
      .object({
        x: z.number(),
        y: z.number(),
      })
      .parse(position);
  },
  getFieldOfView: async () => {
    const fov = await getSEMParam("FIELD_OF_VIEW");
    return z
      .object({
        width: z.number(),
        height: z.number(),
      })
      .parse(fov);
  },
  getStageBounds: async () => {
    const bounds = await getSEMParam("STAGE_BOUNDS");
    return z
      .object({
        x: z.object({
          min: z.number(),
          max: z.number(),
        }),
        y: z.object({
          min: z.number(),
          max: z.number(),
        }),
      })
      .parse(bounds);
  },
  setFrozen: async (frozen) => {
    await setSEMParam("FROZEN", frozen);
  },
  getFrozen: async () => {
    const frozen = await getSEMParam("FROZEN");
    return z.boolean().parse(frozen);
  },
  setFreezeOn: async (freezeOn) => {
    await setSEMParam("FREEZE_ON", freezeOn);
  },
  grabFullFrame: async (props: Parameters<typeof grabSEMImage>[0]) => {
    return grabSEMImage(props);
  },
};
