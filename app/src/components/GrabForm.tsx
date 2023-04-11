import { createSignal, onMount } from "solid-js";
import {
  enqueueGrabCommand,
  getNextCommandId,
} from "src/data/signals/grabQueue";
import { Button } from "./Button";

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
      <span class="font-bold text-md">Reduction</span>
      <div class="flex flex-col gap-2 text-md ml-3">
        <label class="flex flex-row items-center gap-2">
          <input
            type="radio"
            name="reduction"
            onChange={() => setReduction(-1)}
            checked={reduction() === -1}
          />
          Overlay Plane
        </label>
        <label class="flex flex-row items-center gap-2">
          <input
            type="radio"
            name="reduction"
            onChange={() => setReduction(0)}
            checked={reduction() === 0}
          />
          No Subsampling
        </label>
        <label class="flex flex-row items-center gap-2">
          <input
            type="radio"
            name="reduction"
            onChange={() => setReduction(1)}
            checked={reduction() === 1}
          />
          1:2
        </label>
        <label class="flex flex-row items-center gap-2">
          <input
            type="radio"
            name="reduction"
            onChange={() => setReduction(2)}
            checked={reduction() === 2}
          />
          1:3
        </label>
        <label class="flex flex-row items-center gap-2">
          <input
            type="radio"
            name="reduction"
            onChange={() => setReduction(3)}
            checked={reduction() === 3}
          />
          1:4
        </label>
      </div>
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
