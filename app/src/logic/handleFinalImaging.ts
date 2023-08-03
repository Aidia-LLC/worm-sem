import { microscopeApi } from "src/microscopeApi";
import { grabImageOnFrameEnd } from "src/microscopeApi/grabImageOnFrameEnd";
import { FinalSliceConfiguration } from "src/types/canvas";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const handleFinalImaging = async (
  configurations: FinalSliceConfiguration[],
  onProgressUpdate: (percentDone: number) => void,
  scanSpeed: number
) => {
  if (configurations.length === 0)
    return alert("No configurations received. Please try again.");
  onProgressUpdate(0);
  await microscopeApi.grabFullFrame({
    temporary: false,
    ribbonId: configurations[0].ribbonId,
    ribbonName: configurations[0].ribbonName,
    filename: "",
    name: "setup",
  });
  await sleep(500);
  await microscopeApi.setMagnification(configurations[0].magnification);
  await sleep(500);
  await microscopeApi.setDetectorType("ZOOMED_IN");
  await sleep(500);
  await microscopeApi.setScanSpeed(scanSpeed);
  await sleep(500);
  await microscopeApi.setImageQuality("HIGH");
  await sleep(3000);
  for (let i = 0; i < configurations.length; i++) {
    onProgressUpdate(Math.round((i / configurations.length) * 10000) / 100);
    const config = configurations[i];
    await microscopeApi.moveStageTo(config.point);
    await sleep(500);
    await microscopeApi.setBrightness(config.brightness);
    await sleep(500);
    await microscopeApi.setContrast(config.contrast);
    await sleep(500);
    await microscopeApi.setWorkingDistance(config.focus);
    await sleep(5000);
    await grabImageOnFrameEnd(
      {
        name: config.label,
        temporary: false,
        ribbonId: config.ribbonId,
        ribbonName: config.ribbonName,
      },
      {
        minSleepMs: 60_000,
        pollIntervalMs: 5_000,
      }
    );
  }
  onProgressUpdate(100);
};
