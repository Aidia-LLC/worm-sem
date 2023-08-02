import { Message, ParamName } from "src/microscopeApi/types";
import { z } from "zod";
import { MicroscopeDetectorType, MicroscopeImageQuality } from "./types";

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
  abstract getStagePosition(): Promise<{ x: number; y: number }>;
  abstract getFieldOfView(): Promise<{ width: number; height: number }>;
  abstract grabFullFrame(name: string, filename: string): Promise<Message>;
  abstract initialize(): Promise<void>;
  abstract shutdown(): void;

  setParam(param: ParamName, value: any) {
    switch (param) {
      case "MAGNIFICATION":
        const mag = z.number().int().min(1).max(100000).parse(value);
        return this.setMagnification(mag);
      case "BRIGHTNESS":
        const brightness = z.number().int().min(0).max(100).parse(value);
        return this.setBrightness(brightness);
      case "CONTRAST":
        const contrast = z.number().int().min(0).max(100).parse(value);
        return this.setContrast(contrast);
      case "SCAN_SPEED":
        const scanSpeed = z.number().int().min(1).max(10).parse(value);
        return this.setScanSpeed(scanSpeed);
      case "WORKING_DISTANCE":
        const wd = z.number().int().min(0).max(100).parse(value);
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
      default:
        throw new Error(`Unknown param ${param}`);
    }
  }

  getParam(param: ParamName) {
    switch (param) {
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
      case "FIELD_OF_VIEW":
        return this.getFieldOfView();
      default:
        throw new Error(`Unknown param ${param}`);
    }
  }
}
