import { Button } from "@components/Button";
import { Canvas } from "@components/Canvas";
import { HistoryLog } from "@components/HistoryLog";
import { Instructions } from "@components/Instructions";
import { createEffect, createSignal, onMount, Show } from "solid-js";
import { initializeCommandQueue } from "./data/signals/commandQueue";
import { CONNECTION_ID, historySignal } from "./data/signals/history";

export const App = () => {
  const [history] = historySignal;
  const [acknowledged, setAcknowledged] = createSignal(false);
  const [connected, setConnected] = createSignal(false);
  const [samLoaded, setSamLoaded] = createSignal(false);

  onMount(() => {
    initializeCommandQueue();
    fetch(`http://127.0.0.1:3002/init`).then(() => {
      setSamLoaded(true);
    });
  });

  createEffect(() => {
    if (history().find((m) => m.id === CONNECTION_ID)) setConnected(true);
  });

  return (
    <div class="flex flex-col gap-3 m-4">
      <Instructions />
      <Show
        when={connected()}
        fallback={
          <>
            <label class="flex flex-row gap-2">
              <input
                type="checkbox"
                checked={acknowledged()}
                onChange={(e) => setAcknowledged(e.currentTarget.checked)}
              />
              <span>I have disabled the data zone!</span>
            </label>
            <Button
              onClick={() =>
                window.semClient.send({
                  type: "connect",
                  id: CONNECTION_ID,
                })
              }
              disabled={!acknowledged()}
            >
              Connect
            </Button>
          </>
        }
      >
        <Canvas samLoaded={samLoaded()} />
      </Show>
      <HistoryLog />
    </div>
  );
};
