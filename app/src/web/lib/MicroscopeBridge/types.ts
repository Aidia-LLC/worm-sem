import { ElectronMessage } from "@electron/types";

export type SEMClient = {
  send: (comand: Command) => void;
  subscribe: (callback: (message: ElectronMessage) => void) => () => void;
};

export type Command =
  | GrabFullFrameCommand
  | ConnectCommand
  | SetParamCommand
  | GetParamCommand
  | AutoBrightnessAndContrastCommand
  | AutoFocusCoarseCommand
  | AutoFocusFineCommand;

interface BaseCommand {
  id: number;
  type: string;
}

export interface GrabFullFrameCommand extends BaseCommand {
  type: "GRAB_FULL_FRAME";
  name: string;
  filename?: string;
  reduction: number;
  temporary: boolean;
  ribbonId?: number;
  ribbonName?: string;
}

export interface ConnectCommand extends BaseCommand {
  type: "CONNECT";
}

export interface AutoBrightnessAndContrastCommand extends BaseCommand {
  type: "AUTO_BRIGHTNESS_AND_CONTRAST";
}

export interface AutoFocusCoarseCommand extends BaseCommand {
  type: "AUTO_FOCUS_COARSE";
}

export interface AutoFocusFineCommand extends BaseCommand {
  type: "AUTO_FOCUS_FINE";
}

export type ParamName =
  | "SCAN_SPEED"
  | "IMAGE_QUALITY"
  | "FREEZE_ON"
  | "FROZEN"
  | "MAGNIFICATION"
  | "WORKING_DISTANCE"
  | "BRIGHTNESS"
  | "CONTRAST"
  | "STAGE_POSITION"
  | "STAGE_BOUNDS"
  | "FIELD_OF_VIEW"
  | "DETECTOR_TYPE";

export interface SetParamCommand extends BaseCommand {
  type: "SET_PARAM";
  param: ParamName;
  value?: any;
}

export interface GetParamCommand extends BaseCommand {
  type: "GET_PARAM";
  param: ParamName;
}

declare global {
  interface Window {
    semClient: SEMClient;
  }
}
