import { GrabCommand, GrabFullFrameCommand } from "@dto/semClient";
import { createSignal } from "solid-js";
import { historySignal } from "./history";

export const grabQueueSignal = createSignal<
  (GrabCommand | GrabFullFrameCommand)[]
>([]);
const [executing, setExecuting] = createSignal(false);

const executeQueuedCommand = () => {
  const [grabQueue, setGrabQueue] = grabQueueSignal;
  if (executing()) return;
  if (grabQueue().length === 0) {
    setExecuting(false);
    return;
  }
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
    }
  });
};

export const getNextCommandId = () => {
  const [history] = historySignal;
  const lastId = Math.max(1, ...history().map((message) => message.id));
  return lastId + 1;
};
