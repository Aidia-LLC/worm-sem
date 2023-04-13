import { createSignal, onMount } from "solid-js";
import {
  enqueueGrabCommand,
  getNextCommandId,
} from "src/data/signals/grabQueue";
import { Button } from "./Button";
import { ReductionPicker } from "./ReductionPicker";

export const GrabForm = (props: { onGrabbed: (data: string) => void }) => {
  const [commandId, setCommandId] = createSignal<number | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [reduction, setReduction] = createSignal(-1);

  onMount(async () => {
    window.semClient.subscribe((message) => {
      if (message.type !== "success" || message.id !== commandId()) return;
      props.onGrabbed(message.payload!);
    });
  });

  return (
    <div class="flex flex-col gap-3">
      <h3 class="font-bold text-xl">Grab Tester</h3>
      <ReductionPicker value={reduction()} onChange={setReduction} />
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
            reduction: reduction(),
          });
        }}
      >
        Grab Image
      </Button>
    </div>
  );
};
