import { GetParamCommand, Param } from "@dto/semClient";
import { getNextCommandId } from "./signals/commandQueue";

export const getSEMParam = (param: Param): Promise<string> => {
  return new Promise((resolve, reject) => {
    const command: GetParamCommand = {
      id: getNextCommandId(),
      type: "getParam",
      param,
    };
    const unsubscribe = window.semClient.subscribe((message) => {
      if (message.id === command.id) {
        if (message.type === "success") {
          unsubscribe();
          const [_, value] = message.payload!.split("=");
          resolve(value);
        } else {
          reject();
        }
      }
    });
  });
};
