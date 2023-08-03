import {
  MicroscopeDetectorType,
  MicroscopeFreezeOn,
  MicroscopeImageQuality,
} from "@electron/microscope/types";
import { ElectronMessage } from "@electron/types";
import { grabSEMImage } from "./semBridge";

export interface MicroscopeApi {
  /// Connects to the microscope.
  connect(): Promise<void>;

  /// Gets the magnification value of the microscope in times.
  getMagnification(): Promise<number>;

  /// Sets the magnification value of the microscope in times.
  setMagnification(magnification: number): Promise<void>;

  /// Sets the scan speed of the microscope in [1, 10], with 1 being the slowest and 10 being the fastest.
  setScanSpeed(scanSpeed: number): Promise<void>;

  /// Gets the brightness of the microscope.
  getBrightness(): Promise<number>;

  /// Sets the brightness of the microscope.
  setBrightness(brightness: number): Promise<void>;

  /// Gets the contrast of the microscope.
  getContrast(): Promise<number>;

  /// Sets the contrast of the microscope.
  setContrast(contrast: number): Promise<void>;

  /// Gets the working distance of the microscope in meters.
  getWorkingDistance(): Promise<number>;

  /// Sets the working distance of the microscope in meters.
  setWorkingDistance(focus: number): Promise<void>;

  /// Sets the detector type of the microscope.
  setDetectorType(detectorType: MicroscopeDetectorType): Promise<void>;

  /// Sets the image quality of the microscope.
  setImageQuality(imageQuality: MicroscopeImageQuality): Promise<void>;

  /// Moves the stage to the specified coordinates.
  moveStageTo(coordinates: { x: number; y: number }): Promise<void>;

  /// Gets the current stage coordinates.
  getStagePosition(): Promise<{ x: number; y: number }>;

  /// Gets the bounds for the stage
  getStageBounds(): Promise<{
    x: { min: number; max: number };
    y: { min: number; max: number };
  }>;

  /// Gets the current field of view in meters.
  getFieldOfView(): Promise<{ width: number; height: number }>;

  /// Gets the current frozen status
  getFrozen(): Promise<boolean>;

  /// Sets the current frozen status
  setFrozen(frozen: boolean): Promise<void>;

  /// Sets when to freeze the image
  setFreezeOn(freezeOn: MicroscopeFreezeOn): Promise<void>;

  /// Grabs a full frame image from the microscope and saves it to the specified file.
  grabFullFrame(
    props: Parameters<typeof grabSEMImage>[0]
  ): Promise<ElectronMessage>;
}
