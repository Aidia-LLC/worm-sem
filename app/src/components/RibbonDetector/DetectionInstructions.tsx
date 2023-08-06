import { Match, Show, Switch } from "solid-js";
import { ribbonState } from "src/data/signals/globals";

export const DetectionInstructions = () => {
  const [ribbonReducer] = ribbonState;

  return (
    <Show when={ribbonReducer().detection}>
      <span class="text-xl font-bold">
        <Switch>
          <Match when={ribbonReducer().clickedPoints.length === 0}>
            Click the center point of a slice in the middle of the ribbon
          </Match>
          <Match when={ribbonReducer().clickedPoints.length === 1}>
            Click the center point of a slice at the start of the ribbon
          </Match>
          <Match when={ribbonReducer().clickedPoints.length === 2}>
            Click the center point of a slice at the end of the ribbon
          </Match>
          <Match when={ribbonReducer().clickedPoints.length === 3}>
            Click any other points in the ribbon if desired, or click "Detect
            Ribbon" to finish
          </Match>
        </Switch>
      </span>
    </Show>
  );
};
