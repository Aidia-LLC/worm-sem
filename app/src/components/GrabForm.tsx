import { createSignal, onMount } from "solid-js";
import {
  enqueueCommand,
  getNextCommandId,
} from "src/data/signals/commandQueue";
import { Button } from "./Button";

const REDUCTION = -1;

export const GrabForm = (props: { onGrabbed: (data: string) => void }) => {
  const [commandId, setCommandId] = createSignal<number | null>(null);
  const [loading, setLoading] = createSignal(false);

  onMount(async () => {
    window.semClient.subscribe((message) => {
      if (message.type !== "success" || message.id !== commandId()) return;
      props.onGrabbed(message.payload!);
    });
  });

  return (
    <div class="flex flex-col gap-3">
      <Button
        disabled={loading()}
        onClick={() => {
          const ids = [getNextCommandId(), getNextCommandId()];
          setCommandId(ids[1]);
          setLoading(true);
          enqueueCommand({
            id: ids[0],
            type: "setParam",
            param: "DP_IMAGE_STORE",
            value: 7, // 8192 x 6144
          });
          enqueueCommand({
            id: ids[1],
            type: "grabFullFrame",
            name: "grabFullFrame",
            reduction: REDUCTION,
          });
        }}
      >
        Grab Image
      </Button>
    </div>
  );
};
