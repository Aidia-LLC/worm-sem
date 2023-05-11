import { FinalSliceConfiguration } from "src/types/canvas";
import {
  DETECTOR_TYPE_STEM_A_ZOOMED_IN,
  grabSEMImage,
  grabSEMImageOnFrameEnd,
  HIGHEST_IMAGE_QUALITY,
  SLOWEST_SCAN_SPEED,
} from "../data/semParams";
import { getNextCommandId } from "../data/signals/commandQueue";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const handleFinalImaging = async (
  configurations: FinalSliceConfiguration[],
  onProgressUpdate: (percentDone: number) => void
) => {
  if (configurations.length === 0)
    return alert("No configurations received. Please try again.");
  onProgressUpdate(0);
  await grabSEMImage({
    id: getNextCommandId(),
    type: "grabFullFrame",
    name: "setup",
    reduction: -1,
    temporary: false,
    ribbonId: configurations[0].ribbonId,
    ribbonName: configurations[0].ribbonName,
  });
  await sleep(500);
  window.semClient.send({
    id: getNextCommandId(),
    type: "setParam",
    param: "AP_MAG",
    doubleValue: configurations[0].magnification,
  });
  await sleep(500);
  window.semClient.send({
    id: getNextCommandId(),
    type: "setParam",
    param: "DP_DETECTOR_TYPE",
    doubleValue: DETECTOR_TYPE_STEM_A_ZOOMED_IN,
  });
  await sleep(500);
  window.semClient.send({
    id: getNextCommandId(),
    type: "execute",
    command: `CMD_SCANRATE${SLOWEST_SCAN_SPEED}`,
  });
  await sleep(500);
  window.semClient.send({
    id: getNextCommandId(),
    type: "setParam",
    param: "DP_IMAGE_STORE",
    doubleValue: HIGHEST_IMAGE_QUALITY,
  });
  await sleep(3000);
  for (let i = 0; i < configurations.length; i++) {
    onProgressUpdate(Math.round((i / configurations.length) * 10000) / 100);
    const config = configurations[i];
    window.semClient.send({
      id: getNextCommandId(),
      type: "setParam",
      param: "AP_STAGE_GOTO_X",
      doubleValue: config.point.x,
    });
    await sleep(500);
    window.semClient.send({
      id: getNextCommandId(),
      type: "setParam",
      param: "AP_STAGE_GOTO_Y",
      doubleValue: config.point.y,
    });
    await sleep(5000);
    await grabSEMImageOnFrameEnd(
      {
        id: getNextCommandId(),
        type: "grabFullFrame",
        name: config.label,
        reduction: -1,
        temporary: false,
        ribbonId: config.ribbonId,
        ribbonName: config.ribbonName,
      },
      {
        minSleepMs: 60_000,
        pollIntervalMs: 20_000,
      }
    );
  }
  onProgressUpdate(100);
};