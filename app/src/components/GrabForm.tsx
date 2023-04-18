import { createSignal, onMount } from "solid-js";
import {
  enqueueGrabCommand,
  getNextCommandId,
} from "src/data/signals/grabQueue";
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
          const id = getNextCommandId();
          setCommandId(id);
          setLoading(true);
          enqueueGrabCommand({
            id,
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
