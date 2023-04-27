import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { sleep } from "src/data/handleFinalImaging";
import {
  FASTEST_SCAN_SPEED,
  grabSEMImage,
  LOWER_IMAGE_QUALITY,
  MEDIUM_IMAGE_QUALITY,
  MEDIUM_SCAN_SPEED,
} from "src/data/semParams";
import { getNextCommandId } from "src/data/signals/commandQueue";
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
        setSlowGrab(message.payload!);
      }
      // if (message.id === slowGrabId() && message.code === 200) {
      //   setSlowGrab(message.payload!);
      // }
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
        onClick={async () => {
          const ids = [getNextCommandId(), getNextCommandId()] as const;
          setFastGrabId(ids[0]);
          setSlowGrabId(ids[1]);
          setLoading(true);
          window.semClient.send({
            id: getNextCommandId(),
            type: "setParam",
            param: "DP_IMAGE_STORE",
            doubleValue: LOWER_IMAGE_QUALITY,
          });
          await sleep(1000);
          window.semClient.send({
            id: getNextCommandId(),
            type: "execute",
            command: `CMD_SCANRATE${FASTEST_SCAN_SPEED}`,
          });
          await sleep(5000);
          window.semClient.send({
            id: getNextCommandId(),
            type: "setParam",
            param: "DP_FROZEN",
            doubleValue: 0,
          });
          await sleep(2000);
          window.semClient.send({
            id: getNextCommandId(),
            type: "setParam",
            param: "DP_FREEZE_ON",
            doubleValue: 0, // end frame
          });
          await sleep(50000);
          await grabSEMImage({
            id: ids[0],
            type: "grabFullFrame",
            name: "grabFullFrame",
            reduction: REDUCTION,
            temporary: true,
          });
          // window.semClient.send({
          //   id: getNextCommandId(),
          //   type: "setParam",
          //   param: "DP_IMAGE_STORE",
          //   doubleValue: MEDIUM_IMAGE_QUALITY,
          // });
          // await sleep(1000);
          // window.semClient.send({
          //   id: getNextCommandId(),
          //   type: "execute",
          //   command: `CMD_SCANRATE${MEDIUM_SCAN_SPEED}`,
          // });
          // await sleep(5000);
          // window.semClient.send({
          //   id: getNextCommandId(),
          //   type: "setParam",
          //   param: "DP_FROZEN",
          //   doubleValue: 0,
          // });
          // await sleep(2000);
          // window.semClient.send({
          //   id: getNextCommandId(),
          //   type: "setParam",
          //   param: "DP_FREEZE_ON",
          //   doubleValue: 0, // end frame
          // });
          // await sleep(12000);
          // await grabSEMImage({
          //   id: ids[1],
          //   type: "grabFullFrame",
          //   name: "grabFullFrame",
          //   reduction: REDUCTION,
          //   temporary: true,
          // });
        }}
      >
        Grab Initial Image
      </Button>
    </div>
  );
};
