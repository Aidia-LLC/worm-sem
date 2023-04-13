import { Message } from "@dto/semClient";
import { createSignal, onMount } from "solid-js";

export const CONNECTION_ID = 1;

export const historySignal = createSignal<Message[]>([]);

const addHistory = (message: Message) => {
  const [history, setHistory] = historySignal;
  setHistory([...history(), message]);
};

export const clearHistory = () => {
  const [history, setHistory] = historySignal;
  // console.log("clearing history", history());
  setHistory(history().filter((message) => message.id === CONNECTION_ID));
};

onMount(() => {
  window.semClient.subscribe(addHistory);
});
