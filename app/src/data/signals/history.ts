import { Message } from "@dto/semClient";
import { createSignal, onMount } from "solid-js";

export const CONNECTION_ID = 1;
const MAX_HISTORY_LENGTH = 100;

export const historySignal = createSignal<Message[]>([]);

const addHistory = (message: Message) => {
  const [history, setHistory] = historySignal;
  setHistory([...history(), message].slice(-MAX_HISTORY_LENGTH));
};

export const clearHistory = () => {
  const [_, setHistory] = historySignal;
  setHistory([]);
};

onMount(() => {
  window.semClient.subscribe(addHistory);
});
