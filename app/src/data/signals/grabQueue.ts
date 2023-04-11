import { GrabCommand, GrabFullFrameCommand } from "@dto/semClient";
import { createSignal } from "solid-js";

export const grabQueueSignal = createSignal<
  (GrabCommand | GrabFullFrameCommand)[]
>([]);
const [executing, setExecuting] = createSignal(false);
let nextId = 2;

const executeQueuedCommand = () => {
  const [grabQueue, setGrabQueue] = grabQueueSignal;
  if (executing()) return console.log("already executing");
  if (grabQueue().length === 0) {
    setExecuting(false);
    console.log("no commands to execute");
    return;
  }
  console.log("executing command");
  const command = grabQueue()[0];
  window.semClient.send(command);
  setGrabQueue(grabQueue().slice(1));
  setExecuting(true);
};

export const enqueueGrabCommand = (
  command: GrabCommand | GrabFullFrameCommand
) => {
  const [grabQueue, setGrabQueue] = grabQueueSignal;
  setGrabQueue([...grabQueue(), command]);
  if (!executing()) executeQueuedCommand();
};

export const initGrabQueue = () => {
  window.semClient.subscribe((message) => {
    if (message.type === "success") {
      setExecuting(false);
      executeQueuedCommand();
    } else {
      console.error("Error executing command:", message);
    }
  });
};

export const getNextCommandId = () => {
  return nextId++;
};
