export type Message = {
  type: "error" | "success" | "ready";
  id: number;
  code?: number;
  message?: string;
};

export type MessageReceived = (message: Message) => void;

export type SEMClient = {
  send: (comand: Command) => void;
  subscribe: (callback: (message: Message) => void) => void;
};

export type Command =
  | BaseCommand
  | EchoCommand
  | GrabCommand
  | GrabFullFrameCommand;

export interface BaseCommand {
  id: number;
  type: string;
}

export interface EchoCommand extends BaseCommand {
  type: "echo";
  message: string;
}

export interface GrabCommand extends BaseCommand {
  type: "grab";
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  filename: string;
  reduction: number;
}

export interface GrabFullFrameCommand extends BaseCommand {
  type: "grabFullFrame";
  name: string;
  filename: string;
  reduction: number;
}

declare global {
  interface Window {
    semClient: SEMClient;
    getInitialPath: () => Promise<string>;
  }
}
