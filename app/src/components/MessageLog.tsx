import type { Message } from "@dto/semClient";
import { createEffect, createSignal, For } from "solid-js";

export const MessageLog = () => {
  const [messages, setMessages] = createSignal<Message[]>([]);

  createEffect(() => {
    window.semClient.subscribe((message) => {
      setMessages((messages) => [...messages, message]);
    });
  });

  return (
    <div class="flex flex-col gap-3">
      <h3 class="font-bold text-xl mt-4 mx-4">Messages</h3>
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
          {(message) => (
            <tr>
              <td class="p-2">{message.type}</td>
              <td class="p-2">{message.id}</td>
              <td class="p-2">{message.code}</td>
              <td class="p-2">{message.message}</td>
            </tr>
          )}
        </For>
      </table>
    </div>
  );
};
