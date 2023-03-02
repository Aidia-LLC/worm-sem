import { createEffect, createSignal, For } from "solid-js";
import { Message, SEMClient } from "./types/semClient";

export const App = () => {
  const [messages, setMessages] = createSignal<Message[]>([]);

  createEffect(() => {
    const client: SEMClient = (window as any).semClient;
    client.subscribe((message) => {
      setMessages((messages) => [...messages, message]);
    });
  });

  return (
    <div class="bg-blue-300">
      <h1 class="text-2xl">Worms</h1>
      <For each={messages()}>
        {(message) => (
          <div class="bg-white">
            <p>{message.type}</p>
            <p>{message.id}</p>
            <p>{message.code}</p>
            <p>{message.message}</p>
          </div>
        )}
      </For>
      <button
        onClick={() => {
          const client: SEMClient = (window as any).semClient;
          client.send({
            id: Math.floor(Math.random() * 1000),
            type: "print",
            message: "Hello from Solid",
          });
        }}
      >
        Send
      </button>
    </div>
  );
};
