import { sleep } from "@logic/handleFinalImaging";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { FASTEST_SCAN_SPEED } from "src/data/semParams";
import { getNextCommandId } from "src/data/signals/commandQueue";
import {
  imageSrcFilenameSignal,
  imageSrcSignal,
  initialStageSignal,
} from "src/data/signals/globals";
import { microscopeApi } from "src/microscopeApi";
import { grabImageOnFrameEnd } from "src/microscopeApi/grabImageOnFrameEnd";
import { Button } from "../Button";

export const GrabForm = () => {
  const [fastGrabId, setFastGrabId] = createSignal<number | null>(null);
  const [loading, setLoading] = createSignal(false);

  const [_, setImageSrc] = imageSrcSignal;
  const [__, setImageSrcFilename] = imageSrcFilenameSignal;
  const [initialStage, setInitialStage] = initialStageSignal;

  let unsubscribe!: VoidFunction;

  onMount(async () => {
    unsubscribe = window.semClient.subscribe(async (message) => {
      if (message.type !== "success") return;
      if (message.id === fastGrabId() && message.code === 200) {
        setImageSrc(message.payload);
        setImageSrcFilename(message.filename!);
        const stage = await microscopeApi.getStagePosition();
        const limits = await microscopeApi.getStageBounds();
        const fieldOfView = await microscopeApi.getFieldOfView();
        setInitialStage({
          x: stage.x,
          y: stage.y,
          width: fieldOfView.width,
          height: fieldOfView.height,
          limits: {
            x: [limits.x.min, limits.x.max],
            y: [limits.y.min, limits.y.max],
          },
        });
        console.log(initialStage());
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
          await microscopeApi.setImageQuality("LOW");
          await microscopeApi.setDetectorType("ZOOMED_OUT");
          await sleep(1000);
          await microscopeApi.setScanSpeed(FASTEST_SCAN_SPEED);
          await sleep(2000);
          await grabImageOnFrameEnd(
            {
              name: "GRAB_FULL_FRAME",
              temporary: true,
            },
            {
              minSleepMs: 15000,
              pollIntervalMs: 5000,
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
