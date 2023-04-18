import { Command, Param } from "@dto/semClient";
import { createSignal } from "solid-js";
import { semParamsSignal } from "./semParams";

const [semParams, setSemParams] = semParamsSignal;

export const commandQueueSignal = createSignal<Command[]>([]);
const [executing, setExecuting] = createSignal(false);
let nextId = 2;

const executeQueuedCommand = (options: { grabbedMessage: boolean }) => {
  const [grabQueue, setGrabQueue] = commandQueueSignal;
  if (executing()) return console.log("already executing");
  if (grabQueue().length === 0) {
    setExecuting(false);
    console.log("no more commands");
    if (options.grabbedMessage) alert("Done grabbing images!");
    return;
  }
  console.log("executing command");
  const command = grabQueue()[0];
  window.semClient.send(command);
  setGrabQueue(grabQueue().slice(1));
  setExecuting(true);
};

export const enqueueCommand = (command: Command) => {
  const [queue, setQueue] = commandQueueSignal;
  setQueue([...queue(), command]);
  if (!executing())
    executeQueuedCommand({
      grabbedMessage: command.type === "grab",
    });
};

export const initializeCommandQueue = () => {
  window.semClient.subscribe((message) => {
    if (message.type === "success") {
      setExecuting(false);
      executeQueuedCommand({
        grabbedMessage:
          message.code === 200 && !message.message?.includes(" full "),
      });
      if (message.code === 203 || message.code === 204) {
        const [param, value] = message.payload!.split("=");
        setSemParams(new Map(semParams().set(param as Param, value)));
      }
    } else {
      console.error("Error executing command:", message);
    }
  });
};

export const getNextCommandId = () => {
  return nextId++;
};
