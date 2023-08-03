import {
  GetParamCommand,
  GrabFullFrameCommand,
  ParamName,
  SetParamCommand,
} from "./types";

let nextId = 2;

export const getSEMParam = (param: ParamName): Promise<string> => {
  return new Promise((resolve, reject) => {
    const command: GetParamCommand = {
      id: nextId++,
      type: "GET_PARAM",
      param,
    };
    const unsubscribe = window.semClient.subscribe((message) => {
      if (message.id === command.id) {
        unsubscribe();
        if (message.type === "success") {
          const [_, value] = message.payload!.split("=");
          resolve(value);
        } else {
          reject();
        }
      }
    });
    window.semClient.send(command);
  });
};

export const setSEMParam = (param: ParamName, value: any) => {
  return new Promise<void>((resolve, reject) => {
    const command: SetParamCommand = {
      id: nextId++,
      type: "SET_PARAM",
      param,
      value,
    };
    const unsubscribe = window.semClient.subscribe((message) => {
      if (message.id === command.id) {
        unsubscribe();
        if (message.type === "success") {
          resolve();
        } else {
          reject();
        }
      }
    });
    window.semClient.send(command);
  });
};

export const grabSEMImage = (props: {
  name: string;
  filename?: string;
  temporary?: boolean;
  ribbonId?: number;
  ribbonName?: string;
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    const command: GrabFullFrameCommand = {
      id: nextId++,
      type: "GRAB_FULL_FRAME",
      name: props.name,
      filename: props.filename,
      reduction: -1,
      temporary: Boolean(props.temporary),
      ribbonId: props.ribbonId,
      ribbonName: props.ribbonName,
    };
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
