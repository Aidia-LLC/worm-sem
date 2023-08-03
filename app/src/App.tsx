import { Canvas } from "@components/Canvas";
import { HistoryLog } from "@components/HistoryLog";
import { GrabForm } from "@components/InitialGrab";
import { Instructions } from "@components/Instructions";
import { Unconnected } from "@components/Unconnected";
import { createEffect, createSignal, Match, onMount, Switch } from "solid-js";
import { PYTHON_PORT } from "./data/ports";
import { imageSrcSignal } from "./data/signals/globals";
import { CONNECTION_ID, historySignal } from "./data/signals/history";

const DELAY_TO_INITIALIZE_SAM = 10000;

export const App = () => {
  const [history] = historySignal;
  const [connected, setConnected] = createSignal(false);
  const [samLoaded, setSamLoaded] = createSignal(false);
  const [imageSrc] = imageSrcSignal;

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
      <Switch>
        <Match when={!connected()}>
          <Unconnected />
        </Match>
        <Match when={connected() && !imageSrc()}>
          <GrabForm />
        </Match>
        <Match when={connected() && imageSrc()}>
          <Canvas samLoaded={samLoaded()} />
        </Match>
      </Switch>
      <HistoryLog />
    </div>
  );
};
