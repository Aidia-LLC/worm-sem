import { Canvas } from "@components/RibbonDetector/Canvas";
import { HistoryLog } from "@components/HistoryLog";
import { GrabForm } from "@components/InitialGrab";
import { Instructions } from "@components/Instructions";
import { Unconnected } from "@components/Unconnected";
import { createSignal, Match, onMount, Switch } from "solid-js";
import { PYTHON_PORT } from "./data/ports";
import { imageSrcSignal } from "./data/signals/globals";

const DELAY_TO_INITIALIZE_SAM = 10000;

export const App = () => {
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

  return (
    <div class="flex flex-col gap-3 m-4">
      <Instructions />
      <Switch>
        <Match when={!connected()}>
          <Unconnected onConnect={() => setConnected(true)} />
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
