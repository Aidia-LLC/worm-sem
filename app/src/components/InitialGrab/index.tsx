import { sleep } from "@logic/finalImaging";
import { createSignal, Show } from "solid-js";
import {
  initialStageSignal,
  primaryImageSignal,
} from "src/data/signals/globals";
import { microscopeApi } from "src/microscopeApi";
import { grabImageOnFrameEnd } from "src/microscopeApi/grabImageOnFrameEnd";
import { Button } from "../Button";

const SCAN_SPEED = 5;

export const GrabForm = () => {
  const [loading, setLoading] = createSignal(false);
  const [_, setPrimaryImage] = primaryImageSignal;
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
            await microscopeApi.setScanSpeed(SCAN_SPEED);
            await sleep(2000);
            console.log("grabbing image");
            const message = await grabImageOnFrameEnd(
              {
                name: "GRAB_FULL_FRAME",
                temporary: true,
              },
              {
                // minSleepMs: 15000,
                // pollIntervalMs: 5000,
                minSleepMs: 100,
                pollIntervalMs: 100,
              }
            );
            console.log("got image");
            const stage = await microscopeApi.getStagePosition();
            const limits = await microscopeApi.getStageBounds();
            const fieldOfView = await microscopeApi.getFieldOfView();
            setPrimaryImage({
              filename: message.filename!,
              src: message.payload,
            });
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
