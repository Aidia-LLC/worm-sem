import { FinalSliceConfiguration } from "@dto/canvas";
import {
  grabSEMImage,
  grabSEMImageOnFrameEnd,
  HIGHEST_IMAGE_QUALITY,
  SLOWEST_SCAN_SPEED,
} from "./semParams";
import { getNextCommandId } from "./signals/commandQueue";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const handleFinalImaging = async (
  configurations: FinalSliceConfiguration[],
  onProgressUpdate: (percentDone: number) => void
) => {
  onProgressUpdate(0);
  if (configurations.length === 0)
    return alert("No configurations received. Please try again.");
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
    intValue: configurations[0].magnification,
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
    intValue: HIGHEST_IMAGE_QUALITY,
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
