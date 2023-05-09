import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { sleep } from "src/data/handleFinalImaging";
import {
  FASTEST_SCAN_SPEED,
  grabSEMImageOnFrameEnd,
  LOWER_IMAGE_QUALITY,
} from "src/data/semParams";
import { getNextCommandId } from "src/data/signals/commandQueue";
import { Button } from "./Button";

const REDUCTION = -1;

export const GrabForm = (props: {
  onGrabbed: (src: string, filename: string) => void;
}) => {
  const [fastGrabId, setFastGrabId] = createSignal<number | null>(null);
  const [loading, setLoading] = createSignal(false);

  let unsubscribe!: VoidFunction;

  onMount(async () => {
    unsubscribe = window.semClient.subscribe((message) => {
      if (message.type !== "success") return;
      if (message.id === fastGrabId() && message.code === 200) {
        props.onGrabbed(message.payload!, message.filename!);
        setLoading(false);
      }
    });
  });

  onCleanup(() => {
    unsubscribe();
  });

  return (
    <div class="flex flex-col gap-3">
      <Button
        disabled={loading()}
        onClick={async () => {
          const ids = [getNextCommandId()] as const;
          setFastGrabId(ids[0]);
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
          await sleep(1000);
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
          // await sleep(50000);
          await grabSEMImageOnFrameEnd(
            {
              id: ids[0],
              type: "grabFullFrame",
              name: "grabFullFrame",
              reduction: REDUCTION,
              temporary: true,
            },
            {
              minSleepMs: 1000,// 15000
              pollIntervalMs: 2000,
            }
          );
        }}
      >
        Grab Initial Image
      </Button>
      <Show when={loading()}>
        <span>Getting initial image...</span>
      </Show>
    </div>
  );
};
