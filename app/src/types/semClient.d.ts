export type Message = {
  type: "error" | "success" | "ready";
  id: number;
  code?: number;
  message?: string;
  payload?: string;
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
  type: "grabFullFrame";
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

type Param =
  | "DP_IMAGE_STORE"
  | "DP_FREEZE_ON"
  | "DP_FROZEN"
  | "AP_WIDTH"
  | "AP_HEIGHT"
  | "AP_MAG"
  | "AP_WD"
  | "AP_LINE_POSN_X"
  | "AP_LINE_POSN_Y"
  | "AP_PIXEL_SIZE"
  | "AP_BRIGHTNESS"
  | "AP_CONTRAST"
  | "AP_STAGE_AT_X"
  | "AP_STAGE_AT_Y"
  | "AP_STAGE_GOTO_X"
  | "AP_STAGE_GOTO_Y"
  | "AP_STAGE_HIGH_X"
  | "AP_STAGE_HIGH_Y"
  | "AP_STAGE_LOW_X"
  | "AP_STAGE_LOW_Y"
  | "DP_DETECTOR_TYPE";

interface SetParamCommand extends BaseCommand {
  type: "setParam";
  param: Param;
  intValue?: number;
  doubleValue?: number;
}

export interface GetParamCommand extends BaseCommand {
  type: "getParam";
  param: Param;
}

declare global {
  interface Window {
    semClient: SEMClient;
    getInitialPath: () => Promise<string>;
  }
}
