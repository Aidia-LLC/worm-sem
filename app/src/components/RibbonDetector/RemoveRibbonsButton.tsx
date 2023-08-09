import { Button } from "@components/Button";
import { ribbonState } from "@data/signals/globals";
import { Show } from "solid-js";

export const RemoveRibbonsButton = () => {
  const [ribbonReducer, ribbonDispatch] = ribbonState;
  return (
    <Show when={ribbonReducer().ribbons.length > 0}>
      <Button
        variant="danger-outline"
        onClick={() =>
          ribbonDispatch({
            action: "setRibbons",
            payload: ribbonReducer().ribbons.filter((r) =>
              ribbonReducer().enqueuedRibbons.find(
                (er) => er.ribbon.id === r.id
              )
            ),
          })
        }
      >
        Remove All Ribbons
      </Button>
    </Show>
  );
};
