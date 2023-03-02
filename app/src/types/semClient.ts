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

export type Command = BaseCommand | PrintCommand;

export interface BaseCommand {
  id: number;
  type: string;
}

export interface PrintCommand extends BaseCommand {
  type: "print";
  message: string;
}
