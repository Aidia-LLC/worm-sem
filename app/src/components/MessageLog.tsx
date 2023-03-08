import type { Message } from "@dto/semClient";
import { createEffect, createSignal, For } from "solid-js";
import { Button } from "./Button";

export const MessageLog = () => {
  const [messages, setMessages] = createSignal<Message[]>([]);

  createEffect(() => {
    window.semClient.subscribe((message) => {
      setMessages((messages) => [...messages, message]);
    });
  });

  return (
    <div class="flex flex-col gap-3">
      <Button onClick={() => setMessages([])}>Clear</Button>
      <Button
        onClick={() => {
          window.semClient.send({
            id: Math.floor(Math.random() * 1000),
            type: "echo",
            message: "Hello from Solid",
          });
        }}
      >
        Send Test Message
      </Button>
      <h3 class="font-bold text-xl">Messages</h3>
      <table class="bg-blue-300 w-full">
        <thead>
          <tr>
            <th class="p-2 text-left">Type</th>
            <th class="p-2 text-left">ID</th>
            <th class="p-2 text-left">Code</th>
            <th class="p-2 text-left">Message</th>
          </tr>
        </thead>
        <For each={messages()}>
          {(message, i) => (
            <tr>
              <td
                class="p-2"
                classList={{
                  "bg-blue-100": i() % 2 === 0,
                  "bg-blue-300": i() % 2 === 1,
                }}
              >
                {message.type}
              </td>
              <td
                class="p-2"
                classList={{
                  "bg-blue-100": i() % 2 === 0,
                  "bg-blue-300": i() % 2 === 1,
                }}
              >
                {message.id}
              </td>
              <td
                class="p-2"
                classList={{
                  "bg-blue-100": i() % 2 === 0,
                  "bg-blue-300": i() % 2 === 1,
                }}
              >
                {message.code}
              </td>
              <td
                class="p-2"
                classList={{
                  "bg-blue-100": i() % 2 === 0,
                  "bg-blue-300": i() % 2 === 1,
                }}
              >
                {message.message}
              </td>
            </tr>
          )}
        </For>
      </table>
    </div>
  );
};
