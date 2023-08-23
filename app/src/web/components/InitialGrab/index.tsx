import { ParameterPanel } from "@components/RibbonDetector/ParameterPanel";
import { sleep } from "@utils/finalImaging";
import { createSignal, Show } from "solid-js";
import {
  initialStageSignal,
  primaryImageSignal,
} from "@data/globals";
import { grabImageOnFrameEnd } from "@MicroscopeBridge/grabImageOnFrameEnd";
import { microscopeBridge } from "@MicroscopeBridge/index";
import { Button } from "../Button";

const SCAN_SPEED = 5;

export const GrabForm = () => {
  const [loading, setLoading] = createSignal(false);
  const [_, setPrimaryImage] = primaryImageSignal;
  const [__, setInitialStage] = initialStageSignal;

  const handleGrab = async () => {
    try {
      setLoading(true);
      await microscopeBridge.setImageQuality("LOW");
      await microscopeBridge.setDetectorType("ZOOMED_OUT");
      await sleep(1000);
      await microscopeBridge.setScanSpeed(SCAN_SPEED);
      await sleep(2000);
      const message = await grabImageOnFrameEnd(
        {
          name: "GRAB_FULL_FRAME",
          temporary: true,
        },
        {
          // minSleepMs: 15000,
          // pollIntervalMs: 5000,
          minSleepMs: 500,
          pollIntervalMs: 500,
        }
      );
      console.log("got image");
      const stage = await microscopeBridge.getStagePosition();
      const limits = await microscopeBridge.getStageBounds();
      const fieldOfView = await microscopeBridge.getFieldOfView();
      setPrimaryImage({
        filename: message.filename!,
        src: message.payload,
      });
      setInitialStage({
        x: stage.x,
        y: stage.y,
        r: stage.r,
        width: fieldOfView.width,
        height: fieldOfView.height,
        limits: {
          x: [limits.x.min, limits.x.max],
          y: [limits.y.min, limits.y.max],
        },
      });
      setLoading(false);
    } catch (err) {
      alert(`Failed to grab initial image: ${err}`);
    }
  };

  return (
    <div class="flex flex-col gap-3">
      <p class="text-md">
        No image has been grabbed yet. Please move the stage to the desired
        position, set a magnification to see the entire sample, and click the
        button below to grab an image.
      </p>
      <div class="w-min">
        <Button
          disabled={loading()}
          onClick={handleGrab}
          class="whitespace-nowrap"
        >
          Grab Image
        </Button>
      </div>
      <Show when={loading()}>
        <span>Grabbing image...</span>
      </Show>
      <ParameterPanel />
    </div>
  );
};
