import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { FASTEST_SCAN_SPEED, LOWER_IMAGE_QUALITY, MEDIUM_IMAGE_QUALITY, MEDIUM_SCAN_SPEED } from "src/data/semParams";
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
            getNextCommandId(),
          ] as const;
          setFastGrabId(ids[2]);
          setSlowGrabId(ids[5]);
          setLoading(true);
          enqueueCommand({
            id: ids[0],
            type: "setParam",
            param: "DP_IMAGE_STORE",
            intValue: LOWER_IMAGE_QUALITY, // 1024 * 768
          });
          enqueueCommand({
            id: ids[1],
            type: "execute",
            command: `CMD_SCANRATE${FASTEST_SCAN_SPEED}`,
          });
          enqueueCommand({
            id: ids[2],
            type: "grabFullFrame",
            name: "grabFullFrame",
            reduction: REDUCTION,
            temporary: true,
          });
          enqueueCommand({
            id: ids[3],
            type: "setParam",
            param: "DP_IMAGE_STORE",
            intValue: MEDIUM_IMAGE_QUALITY, // 8192 x 6144
          });
          enqueueCommand({
            id: ids[4],
            type: "execute",
            command: `CMD_SCANRATE${MEDIUM_SCAN_SPEED}`,
          });
          enqueueCommand({
            id: ids[5],
            type: "grabFullFrame",
            name: "grabFullFrame",
            reduction: REDUCTION,
            temporary: true,
          });
        }}
      >
        Grab Initial Image
      </Button>
    </div>
  );
};
