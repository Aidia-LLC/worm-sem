import { sleep } from "@logic/handleFinalImaging";
import { createSignal, Show } from "solid-js";
import { FASTEST_SCAN_SPEED } from "src/data/semParams";
import {
  imageSrcFilenameSignal,
  imageSrcSignal,
  initialStageSignal,
} from "src/data/signals/globals";
import { microscopeApi } from "src/microscopeApi";
import { grabImageOnFrameEnd } from "src/microscopeApi/grabImageOnFrameEnd";
import { Button } from "../Button";

export const GrabForm = () => {
  const [loading, setLoading] = createSignal(false);
  const [_, setImageSrc] = imageSrcSignal;
  const [__, setImageSrcFilename] = imageSrcFilenameSignal;
  const [initialStage, setInitialStage] = initialStageSignal;

  return (
    <div class="flex flex-col gap-3">
      <Button
        disabled={loading()}
        onClick={async () => {
          try {
            setLoading(true);
            await microscopeApi.setImageQuality("LOW");
            await microscopeApi.setDetectorType("ZOOMED_OUT");
            await sleep(1000);
            await microscopeApi.setScanSpeed(FASTEST_SCAN_SPEED);
            await sleep(2000);
            console.log("grabbing image");
            const message = await grabImageOnFrameEnd(
              {
                name: "GRAB_FULL_FRAME",
                temporary: true,
              },
              {
                minSleepMs: 15000,
                pollIntervalMs: 5000,
              }
            );
            console.log("got image");
            const stage = await microscopeApi.getStagePosition();
            const limits = await microscopeApi.getStageBounds();
            const fieldOfView = await microscopeApi.getFieldOfView();
            setImageSrc(message.payload);
            setImageSrcFilename(message.filename!);
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
          } catch (err) {
            alert(`Failed to grab initial image: ${err}`);
          }
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
