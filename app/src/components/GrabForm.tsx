import { createSignal, onMount } from "solid-js";
import {
  enqueueGrabCommand,
  getNextCommandId,
} from "src/data/signals/grabQueue";
import { Button } from "./Button";

export const GrabForm = (props: { onGrabbed: (data: string) => void }) => {
  const [commandId, setCommandId] = createSignal<number | null>(null);
  const [loading, setLoading] = createSignal(false);

  let reductionRef!: HTMLInputElement;

  onMount(async () => {
    window.semClient.subscribe((message) => {
      if (message.type !== "success" || message.id !== commandId()) return;
      props.onGrabbed(message.payload!);
    });
  });

  return (
    <div class="flex flex-col gap-3">
      <h3 class="font-bold text-xl">Grab Tester</h3>
      <span class="-mb-2 font-bold">
        Reduction (integer between -1 and 3, -1 is no reduction)
      </span>
      <input
        ref={reductionRef}
        type="number"
        placeholder="reduction (integer between -1 and 3)"
        value={-1}
      />
      <Button
        disabled={loading()}
        onClick={() => {
          const reduction = parseInt(reductionRef.value);
          if (reduction < -1 || reduction > 3)
            return alert("Reduction must be between -1 and 3");
          const id = getNextCommandId();
          setCommandId(id);
          setLoading(true);
          enqueueGrabCommand({
            id,
            type: "grabFullFrame",
            name: "grabFullFrame",
            reduction,
          });
        }}
      >
        Grab Full Frame
      </Button>
    </div>
  );
};
