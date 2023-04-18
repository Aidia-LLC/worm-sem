import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import {
  enqueueCommand,
  getNextCommandId,
} from "src/data/signals/commandQueue";
import { Button } from "./Button";

const REDUCTION = -1;

export const GrabForm = (props: {
  onGrabbed: (fast: string, slow: string) => void;
}) => {
  const [fastGrabId, setFastGrabId] = createSignal<number | null>(null);
  const [fastGrab, setFastGrab] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [slowGrabId, setSlowGrabId] = createSignal<number | null>(null);
  const [slowGrab, setSlowGrab] = createSignal<string | null>(null);

  let unsubscribe!: VoidFunction;

  onMount(async () => {
    unsubscribe = window.semClient.subscribe((message) => {
      if (message.type !== "success") return;
      if (message.id === fastGrabId() && message.code === 200) {
        setFastGrab(message.payload!);
      }
      if (message.id === slowGrabId() && message.code === 200) {
        setSlowGrab(message.payload!);
      }
    });
  });

  createEffect(() => {
    if (fastGrab() && slowGrab()) {
      setLoading(false);
      props.onGrabbed(fastGrab()!, slowGrab()!);
    }
  });

  onCleanup(() => {
    unsubscribe();
  });

  return (
    <div class="flex flex-col gap-3">
      <Button
        disabled={loading()}
        onClick={() => {
          const ids = [
            getNextCommandId(),
            getNextCommandId(),
            getNextCommandId(),
            getNextCommandId(),
            getNextCommandId(),
          ] as const;
          setFastGrabId(ids[2]);
          setSlowGrabId(ids[4]);
          setLoading(true);
          enqueueCommand({
            id: ids[0],
            type: "setParam",
            param: "DP_IMAGE_STORE",
            value: 0, // 1024 * 768
          });
          // TODO figure out how to adjust the scan rate
          // enqueueCommand({
          //   id: ids[1],
          //   type: "setParam",
          //   param: "DP_S",
          //   value: 0, // 1024 * 768
          // });
          enqueueCommand({
            id: ids[2],
            type: "grabFullFrame",
            name: "grabFullFrame",
            reduction: REDUCTION,
          });
          enqueueCommand({
            id: ids[3],
            type: "setParam",
            param: "DP_IMAGE_STORE",
            value: 7, // 8192 x 6144
          });
          enqueueCommand({
            id: ids[4],
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
