import { Button } from "@components/Button";
import {
  initialStageSignal,
  magnificationSignal,
  primaryImageSignal,
  ribbonState,
} from "@data/globals";
import { setupFinalConfigurations } from "@utils/finalImaging";
import { createSignal, Show } from "solid-js";

export const EnqueueRibbon = () => {
  const [stage] = initialStageSignal;
  const [ribbonReducer, ribbonDispatch] = ribbonState;
  const [magnification] = magnificationSignal;
  const [primaryImage] = primaryImageSignal;
  const [confirm, setConfirm] = createSignal(false);

  const ribbon = () =>
    ribbonReducer().ribbons.find(
      (r) => r.id === ribbonReducer().focusedRibbonId
    )!;

  return (
    <Button
      variant="danger"
      onClick={() => {
        if (!confirm()) {
          setConfirm(true);
          setTimeout(() => {
            setConfirm(false);
          }, 1000);
          return;
        }

        const r = ribbon();
        const s = stage();
        if (!r || !s) return;

        ribbonDispatch({
          action: "enqueueRibbon",
          payload: {
            ribbon: {
              id: r.id,
              name: r.name,
            },
            stage: s,
            slices: setupFinalConfigurations({
              canvasConfiguration: primaryImage()!.size!,
              ribbon: r,
              ribbonId: r.id,
              magnification: magnification(),
              stageConfiguration: s,
            }),
          },
        });
      }}
    >
      <Show when={confirm()} fallback="Queue Ribbon">
        Click again to confirm
      </Show>
    </Button>
  );
};
