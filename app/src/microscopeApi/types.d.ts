export type Message = {
  type: "error" | "success" | "ready";
  id: number;
  code?: number;
  message?: string;
  payload?: any;
  filename?: string;
};

export type SEMClient = {
  send: (comand: Command) => void;
  subscribe: (callback: (message: Message) => void) => () => void;
};

export type Command =
  | GrabFullFrameCommand
  | ConnectCommand
  | SetParamCommand
  | GetParamCommand
  | ExecuteCommand;

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

interface ConnectCommand extends BaseCommand {
  type: "connect";
}

interface ExecuteCommand extends BaseCommand {
  type: "execute";
  command: CommandString;
}

type CommandString = `CMD_SCANRATE${number}` | "CMD_UNFREEZE_ALL";

type ParamName =
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

interface SetParamCommand extends BaseCommand {
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
    getInitialPath: () => Promise<string>;
  }
}
