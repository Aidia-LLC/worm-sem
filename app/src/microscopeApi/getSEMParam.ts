import { GetParamCommand, ParamName, SetParamCommand } from "./types";

let nextId = 2;

export const getNextCommandId = () => {
  return nextId++;
};

export const getSEMParam = (param: ParamName): Promise<string> => {
  return new Promise((resolve, reject) => {
    const command: GetParamCommand = {
      id: getNextCommandId(),
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
      id: getNextCommandId(),
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
