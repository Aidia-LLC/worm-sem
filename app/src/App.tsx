import { Button } from "@components/Button";
import { FinalImaging } from "@components/FinalImaging";
import { GrabForm } from "@components/InitialGrab";
import { Instructions } from "@components/Instructions";
import { RibbonDetector } from "@components/RibbonDetector";
import { SliceConfigurationScreen } from "@components/SliceConfigurationScreen";
import { Unconnected } from "@components/Unconnected";
import {
  createEffect,
  createSignal,
  Match,
  onMount,
  Show,
  Switch,
} from "solid-js";
import { PYTHON_PORT } from "./config";
import {
  initialStageSignal,
  primaryImageSignal,
  ribbonState,
} from "./lib/data/signals/globals";

const DELAY_TO_INITIALIZE_SAM = 10000;

export const App = () => {
  const [connected, setConnected] = createSignal(false);
  const [samLoaded, setSamLoaded] = createSignal(false);
  const [primaryImage] = primaryImageSignal;
  const [ribbonReducer, dispatch] = ribbonState;
  const [initialStage] = initialStageSignal;
  const [confirmImaging, setConfirmImaging] = createSignal(false);

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

  const imaging = () => ribbonReducer().phase === "imaging";
  const enqueuedRibbons = () => ribbonReducer().enqueuedRibbons;
  const enqueuedSlices = () =>
    ribbonReducer().enqueuedRibbons.reduce(
      (sum, r) => sum + r.slices.length,
      0
    );

  createEffect(() => {
    ribbonReducer();
  });

  return (
    <div class="flex flex-col gap-3 m-4">
      <Instructions />
      <Show when={enqueuedRibbons().length > 0 && !imaging()}>
        <div class="rounded-lg my-4 p-4 bg-green-200 flex flex-row items-center justify-between">
          <span>
            {enqueuedRibbons().length} ribbon
            {enqueuedRibbons().length === 1 ? "" : "s"} ({enqueuedSlices()}{" "}
            slices) enqueued for imaging
          </span>
          <div>
            <Button
              onClick={() => {
                if (!confirmImaging()) {
                  setConfirmImaging(true);
                  setTimeout(() => setConfirmImaging(false), 1000);
                  return;
                }
                dispatch({ action: "setPhase", payload: "imaging" });
              }}
              tooltipPosition="left"
              tooltip="Once you've configured all of the ribbons you want to image, click here to review them all before imaging."
            >
              <Show when={confirmImaging()} fallback="Begin Imaging">
                Click to confirm
              </Show>
            </Button>
          </div>
        </div>
      </Show>
      <Switch>
        <Match when={!connected()}>
          <Unconnected onConnect={() => setConnected(true)} />
        </Match>
        <Match when={connected() && !primaryImage()}>
          <GrabForm />
        </Match>
        <Match
          when={
            connected() &&
            primaryImage() &&
            ribbonReducer().focusedRibbonId &&
            initialStage()
          }
        >
          <SliceConfigurationScreen />
        </Match>
        <Match when={connected() && primaryImage() && !imaging()}>
          <RibbonDetector samLoaded={samLoaded()} />
        </Match>
        <Match when={imaging()}>
          <FinalImaging />
        </Match>
      </Switch>
    </div>
  );
};
