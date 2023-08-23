import { ElectronMessage } from "@electron/types";
import { ParamName } from "@MicroscopeBridge/types";
import { z } from "zod";
import {
  MicroscopeDetectorType,
  MicroscopeFreezeOn,
  MicroscopeImageQuality,
} from "./types";

export abstract class MicroscopeCallingInterface {
  abstract getMagnification(): Promise<number>;
  abstract setMagnification(magnification: number): Promise<void>;
  abstract getBrightness(): Promise<number>;
  abstract setBrightness(brightness: number): Promise<void>;
  abstract getContrast(): Promise<number>;
  abstract setContrast(contrast: number): Promise<void>;
  abstract setScanSpeed(scanSpeed: number): Promise<void>;
  abstract getWorkingDistance(): Promise<number>;
  abstract setWorkingDistance(wd: number): Promise<void>;
  abstract setDetectorType(detectorType: MicroscopeDetectorType): Promise<void>;
  abstract setImageQuality(imageQuality: MicroscopeImageQuality): Promise<void>;
  abstract moveStageTo({ x, y }: { x: number; y: number }): Promise<void>;
  abstract rotateStageTo(r: number): Promise<void>;
  abstract getStagePosition(): Promise<{ x: number; y: number; r: number }>;
  abstract getStageBounds(): Promise<{
    x: { min: number; max: number };
    y: { min: number; max: number };
  }>;
  abstract getFieldOfView(): Promise<{ width: number; height: number }>;
  abstract grabFullFrame(
    name: string,
    filename: string
  ): Promise<ElectronMessage>;
  abstract setFrozen(frozen: boolean): Promise<void>;
  abstract getFrozen(): Promise<boolean>;
  abstract setFreezeOn(freezeOn: MicroscopeFreezeOn): Promise<void>;

  abstract initialize(): Promise<void>;
  abstract connect(): Promise<void>;
  abstract shutdown(): void;

  setParam(param: ParamName, value: any) {
    switch (param) {
      case "FROZEN":
        return this.setFrozen(value);
      case "FREEZE_ON":
        return this.setFreezeOn(value);
      case "MAGNIFICATION":
        const mag = z.number().int().min(1).max(100000).parse(value);
        return this.setMagnification(mag);
      case "BRIGHTNESS":
        const brightness = z.number().min(0).max(100).parse(value);
        return this.setBrightness(brightness);
      case "CONTRAST":
        const contrast = z.number().min(0).max(100).parse(value);
        return this.setContrast(contrast);
      case "SCAN_SPEED":
        const scanSpeed = z.number().int().min(1).max(10).parse(value);
        return this.setScanSpeed(scanSpeed);
      case "WORKING_DISTANCE":
        const wd = z.number().min(0).max(100).parse(value);
        return this.setWorkingDistance(wd);
      case "DETECTOR_TYPE":
        return this.setDetectorType(value);
      case "IMAGE_QUALITY":
        return this.setImageQuality(value);
      case "STAGE_POSITION":
        const position = z
          .object({
            x: z.number(),
            y: z.number(),
          })
          .parse(value);
        return this.moveStageTo(position);
      case "STAGE_ROTATION": {
        const rotation = z.number().parse(value);
        return this.rotateStageTo(rotation);
      }
      case "FIELD_OF_VIEW":
      case "STAGE_BOUNDS":
        throw new Error(`Cannot set ${param}`);
    }
  }

  getParam(param: ParamName) {
    switch (param) {
      case "FROZEN":
        return this.getFrozen();
      case "MAGNIFICATION":
        return this.getMagnification();
      case "BRIGHTNESS":
        return this.getBrightness();
      case "CONTRAST":
        return this.getContrast();
      case "WORKING_DISTANCE":
        return this.getWorkingDistance();
      case "STAGE_POSITION":
        return this.getStagePosition();
      case "STAGE_ROTATION":
        return this.getStagePosition().then(({ r }) => r);
      case "FIELD_OF_VIEW":
        return this.getFieldOfView();
      case "STAGE_BOUNDS":
        return this.getStageBounds();
      case "DETECTOR_TYPE":
      case "FREEZE_ON":
      case "IMAGE_QUALITY":
      case "SCAN_SPEED":
        throw new Error(`Cannot get ${param} (or not yet implemented)`);
    }
  }
}
