import { ribbonState } from "@data/globals";
import { Match, Show, Switch } from "solid-js";

export const DetectionInstructions = () => {
  const [ribbonReducer] = ribbonState;

  return (
    <Show when={ribbonReducer().detection}>
      <span class="text-lg font-medium leading-snug min-h-[96px]">
        <Switch>
          <Match when={ribbonReducer().referencePoints.length === 0}>
            Click the center point of the slice at the END of the ribbon
          </Match>
          <Match when={ribbonReducer().referencePoints.length === 1}>
            Click the center point of the slice at the START of the ribbon
          </Match>
          <Match when={ribbonReducer().referencePoints.length === 2}>
            Click the center point of ANY other slice in the ribbon.
          </Match>
          <Match when={ribbonReducer().referencePoints.length > 2}>
            Click the center point of ANY other slices in the ribbon if desired.
            These extra points may help the mask algorithm work better. They
            also will be used as additional reference points to attempt to
            detect the ribbon if other points don't perform well. Click "Detect
            Ribbon" when you are done.
          </Match>
        </Switch>
      </span>
    </Show>
  );
};
