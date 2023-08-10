import { Button } from "@components/Button";
import { getInterpolationGroups } from "src/lib/utils/interpolation";
import { getIndicesOfSlicesToConfigure } from "src/lib/utils/getIndicesOfSlicesToConfigure";
import { For, onMount } from "solid-js";
import { ribbonState } from "src/lib/data/signals/globals";
import { GrouperCanvas } from "./GrouperCanvas";
import { groupColors } from "./colors";

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

  const interpolationGroups = () => getInterpolationGroups(ribbon());

  return (
    <div class="flex flex-col gap-2 items-center">
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
      <h2 class="text-2xl font-bold mb-2">Select slices to configure</h2>
      <div class="grid grid-cols-4 gap-1">
        <span class="text-lg font-bold text-center">Slice</span>
        <span class="text-lg font-bold text-center">Tweak X/Y</span>
        <span class="text-lg font-bold text-center">
          Set Brightness/Contrast/WD
        </span>
        <span class="text-lg font-bold text-center">Interpolation Group</span>
        <For each={ribbon().slices}>
          {(slice, i) => (
            <>
              <span class="text-center">Slice {i() + 1}</span>
              <div class="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={ribbon().slicesToMove.includes(slice.id)}
                  onChange={(e) => {
                    if (e.currentTarget.checked) {
                      dispatch({
                        action: "setSlicesToMove",
                        payload: [...ribbon().slicesToMove, slice.id],
                      });
                    } else {
                      dispatch({
                        action: "setSlicesToMove",
                        payload: ribbon().slicesToMove.filter(
                          (id) => id !== slice.id
                        ),
                      });
                    }
                  }}
                />
              </div>
              <div class="flex items-center justify-center">
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
              </div>
              <div class="flex flex-row gap-2 relative">
                <For
                  each={[...(interpolationGroups().get(slice.id) || new Set())]}
                >
                  {(group) => (
                    <div
                      class="absolute w-4 h-4"
                      style={{
                        "background-color": groupColors[group % groupColors.length],
                        left: `${(group + 1) * 1.5}rem`,
                      }}
                    />
                  )}
                </For>
              </div>
            </>
          )}
        </For>
      </div>
      <GrouperCanvas groups={interpolationGroups()} />
    </div>
  );
};
