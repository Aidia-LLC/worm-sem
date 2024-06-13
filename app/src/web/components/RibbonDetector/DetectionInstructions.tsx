import { ribbonState } from "@data/globals";
import { Match, Show, Switch } from "solid-js";

export const DetectionInstructions = () => {
  const [ribbonReducer] = ribbonState;

  return (
    <Show when={ribbonReducer().detection}>
      <span class="text-lg font-medium leading-snug min-h-[96px]">
        <Switch>
          <Match when={ribbonReducer().referencePoints.length === 0}>
            Click the center point of the slice at the START of the ribbon
          </Match>
          <Match when={ribbonReducer().referencePoints.length === 1}>
            Adjust the box size to be as small as possible. Then, click a center point 1-3 slices away.
          </Match>
          <Match when={ribbonReducer().referencePoints.length >= 2}>
            Continue to click the center points of slices 1-3 away from the last point. Click "Detect
            Ribbon" when you are done.
          </Match>
          <Match when={true}>
            If you need to restart, click "disable detection" and then "enable detection" again.
          </Match>
        </Switch>
      </span>
    </Show>
  );
};
