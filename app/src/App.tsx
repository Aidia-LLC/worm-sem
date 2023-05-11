import { Button } from "@components/Button";
import { Canvas } from "@components/Canvas";
import { HistoryLog } from "@components/HistoryLog";
import { Instructions } from "@components/Instructions";
import { createEffect, createSignal, onMount, Show } from "solid-js";
import { PYTHON_PORT } from "./data/ports";
import { CONNECTION_ID, historySignal } from "./data/signals/history";

const DELAY_TO_INITIALIZE_SAM = 3000;

export const App = () => {
  const [history] = historySignal;
  const [acknowledged, setAcknowledged] = createSignal(false);
  const [connected, setConnected] = createSignal(false);
  const [samLoaded, setSamLoaded] = createSignal(false);

  onMount(() => {
    setTimeout(() => {
      fetch(`http://127.0.0.1:${PYTHON_PORT}/init`)
        .then((d) => d.json())
        .then((d) => {
          if (!d.success) {
            alert(`Failed to initialize SAM: ${JSON.stringify(d)}`);
            return;
          }
          setSamLoaded(true);
        })
        .catch((e) => {
          alert(`Failed to initialize SAM: ${e}`);
        });
    }, DELAY_TO_INITIALIZE_SAM);
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
