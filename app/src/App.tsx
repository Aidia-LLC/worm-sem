import { Button } from "@components/Button";
import { Canvas } from "@components/Canvas";
import { HistoryLog } from "@components/HistoryLog";
import { onMount, Show } from "solid-js";
import { initGrabQueue } from "./data/signals/grabQueue";
import { CONNECTION_ID, historySignal } from "./data/signals/history";

export const App = () => {
  const [history] = historySignal;

  onMount(() => {
    initGrabQueue();
  });

  const connected = () => history().find((m) => m.id === CONNECTION_ID);

  return (
    <div class="flex flex-col gap-3 m-4">
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
