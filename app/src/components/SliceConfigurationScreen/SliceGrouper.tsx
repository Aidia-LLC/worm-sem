import { Button } from "@components/Button";
import { getIndicesOfSlicesToConfigure } from "@logic/sliceConfiguration";
import { For, Match, onMount, Switch } from "solid-js";
import { ribbonState } from "src/data/signals/globals";
import {
  DownArrow,
  InterpolatedSymbol,
  ManuallyConfigured,
  TwoHeadedVerticalArrow,
  UpArrow,
} from "./SliceGrouperSymbols";

export const SliceGrouper = () => {
  const [ribbonReducer, dispatch] = ribbonState;

  const ribbon = () =>
    ribbonReducer().ribbons.find(
      (ribbon) => ribbon.id === ribbonReducer().focusedRibbonId
    )!;

  onMount(() => {
    if (ribbon().slicesToConfigure.length === 0) {
      const indices = getIndicesOfSlicesToConfigure(ribbon().slices.length);
      dispatch({
        action: "setSlicesToConfigure",
        payload: ribbon()
          .slices.filter((_, index) => indices.includes(index))
          .map((s) => s.id),
      });
    }
  });

  return (
    <div class="flex flex-col gap-2 items-center max-w-lg">
      <div class="self-end">
        <Button
          variant="secondary"
          onClick={() =>
            dispatch({
              action: "setFocusedRibbonId",
              payload: null,
            })
          }
        >
          Cancel
        </Button>
      </div>
      <h2 class="text-xl font-bold">Select slices to configure</h2>
      <p class="text-sm">
        You must configure at least the first and last slice. Any unselected
        slices will be interpolated. If there are any slices you want to exclude
        from the interpolation, you can do so by selecting it and each of its
        neighbors.
      </p>
      <div class="grid grid-cols-2 gap-1">
        <For each={ribbon().slices}>
          {(slice, i) => (
            <>
              <label class="flex flex-row gap-2">
                <input
                  type="checkbox"
                  checked={ribbon().slicesToConfigure.includes(slice.id)}
                  disabled={i() === 0 || i() === ribbon().slices.length - 1}
                  onChange={(e) => {
                    if (e.currentTarget.checked) {
                      dispatch({
                        action: "setSlicesToConfigure",
                        payload: [...ribbon().slicesToConfigure, slice.id],
                      });
                    } else {
                      dispatch({
                        action: "setSlicesToConfigure",
                        payload: ribbon().slicesToConfigure.filter(
                          (id) => id !== slice.id
                        ),
                      });
                    }
                  }}
                />
                <span>Slice {i() + 1}</span>
              </label>
              <span class="text-center flex items-center justify-center">
                <Switch fallback={<InterpolatedSymbol />}>
                  <Match when={ribbon().slicesToConfigure.includes(slice.id)}>
                    <ManuallyConfigured />
                  </Match>
                  <Match
                    when={
                      ribbon().slicesToConfigure.includes(
                        ribbon().slices[i() - 1]?.id ?? -1
                      ) &&
                      ribbon().slicesToConfigure.includes(
                        ribbon().slices[i() + 1]?.id ?? -1
                      )
                    }
                  >
                    <TwoHeadedVerticalArrow />
                  </Match>
                  <Match
                    when={ribbon().slicesToConfigure.includes(
                      ribbon().slices[i() - 1]?.id ?? -1
                    )}
                  >
                    <UpArrow />
                  </Match>
                  <Match
                    when={ribbon().slicesToConfigure.includes(
                      ribbon().slices[i() + 1]?.id ?? -1
                    )}
                  >
                    <DownArrow />
                  </Match>
                </Switch>
              </span>
            </>
          )}
        </For>
      </div>
    </div>
  );
};
