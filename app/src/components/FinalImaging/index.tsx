import { handleFinalImaging } from "@logic/finalImaging";
import { createSignal, onCleanup, onMount } from "solid-js";
import { ribbonState, scanSpeedSignal } from "src/data/signals/globals";

const MIN_DOT_COUNT = 2;
const MAX_DOT_COUNT = 10;
const DOT_DELAY = 500;

export const FinalImaging = () => {
  const [slicesComplete, setSlicesComplete] = createSignal(0);
  const [ribbonReducer, ribbonDispatch] = ribbonState;
  const [scanSpeed] = scanSpeedSignal;
  const [dotCount, setDotCount] = createSignal(3);

  onMount(async () => {
    const ribbons = ribbonReducer().enqueuedRibbons;
    console.log("final config", ribbons);
    try {
      await handleFinalImaging({
        configurations: ribbons,
        onProgressUpdate: setSlicesComplete,
        scanSpeed: scanSpeed(),
      });
      alert("Done imaging!");
    } catch (err) {
      console.error(err);
      alert(`Error imaging. ${(err as Error).message}`);
    }
    ribbonDispatch({
      action: "setPhase",
      payload: "ribbon-detection",
    });
  });

  let timer: any;
  onMount(() => {
    timer = setInterval(() => {
      let newCount = dotCount() + 1;
      if (newCount > MAX_DOT_COUNT) newCount = MIN_DOT_COUNT;
      setDotCount(newCount);
    }, DOT_DELAY);
  });

  onCleanup(() => {
    if (timer) clearInterval(timer);
  });

  const sliceCount = () =>
    ribbonReducer().enqueuedRibbons.flatMap((r) => r.slices).length;

  const percentComplete = () =>
    ((slicesComplete() / sliceCount()) * 100).toFixed(2);

  return (
    <div class="flex flex-col gap-3">
      <div class="font-bold">
        Imaging{Array.from({ length: dotCount() }).map(() => ".")}
      </div>
      <div class="h-4 w-full bg-gray-300 rounded-full">
        <div
          class="h-full bg-green-500 rounded-full"
          style={`width: ${percentComplete()}%`}
        ></div>
      </div>
      <div>
        {slicesComplete()} / {sliceCount()} slices complete
      </div>
      <div>{percentComplete()}% complete</div>
    </div>
  );
};
