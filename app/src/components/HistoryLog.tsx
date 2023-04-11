import { createSignal, For, Show } from "solid-js";
import {
  clearHistory,
  CONNECTION_ID,
  historySignal,
} from "src/data/signals/history";
import { Button } from "./Button";

export const HistoryLog = () => {
  const [show, setShow] = createSignal(false);
  const [messages] = historySignal;

  const messagesToShow = () => messages().filter((m) => m.id !== CONNECTION_ID);

  return (
    <div class="flex flex-col gap-3">
      <div class="self-end flex flex-row gap-2">
        <Show when={show() && messagesToShow().length > 0}>
          <Button variant="secondary" onClick={clearHistory}>
            Clear History
          </Button>
        </Show>
        <Button variant='secondary' onClick={() => setShow(!show())}>
          {show() ? "Hide" : "Show"} History
        </Button>
      </div>

      <Show when={show()}>
        <div class="flex flex-col gap-3">
          <div class="flex flex-row justify-between items-center">
            <h3 class="font-bold text-xl">History</h3>
          </div>
          <Show
            when={messagesToShow().length > 0}
            fallback={<div class="text-gray-500">No messages to show</div>}
          >
            <table class="bg-blue-300 w-full">
              <thead>
                <tr>
                  <th class="p-2 text-left">Type</th>
                  <th class="p-2 text-left">ID</th>
                  <th class="p-2 text-left">Code</th>
                  <th class="p-2 text-left">Message</th>
                </tr>
              </thead>
              <For each={messagesToShow()}>
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
          </Show>
        </div>
      </Show>
    </div>
  );
};
