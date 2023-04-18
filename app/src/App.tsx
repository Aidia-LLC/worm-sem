import { Button } from "@components/Button";
import { Canvas } from "@components/Canvas";
import { HistoryLog } from "@components/HistoryLog";
import { Instructions } from "@components/Instructions";
import { onMount, Show } from "solid-js";
import { initializeCommandQueue } from "./data/signals/commandQueue";
import { CONNECTION_ID, historySignal } from "./data/signals/history";

export const App = () => {
  const [history] = historySignal;

  onMount(() => {
    initializeCommandQueue();
  });

  const connected = () => history().find((m) => m.id === CONNECTION_ID);

  return (
    <div class="flex flex-col gap-3 m-4">
      <Instructions />
      <Show
        when={connected()}
        fallback={
          <Button
            onClick={() =>
              window.semClient.send({
                type: "connect",
                id: CONNECTION_ID,
              })
            }
          >
            Connect
          </Button>
        }
      >
        <Canvas />
      </Show>
      <HistoryLog />
    </div>
  );
};
