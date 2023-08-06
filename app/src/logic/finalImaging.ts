import { microscopeApi } from "src/microscopeApi";
import { grabImageOnFrameEnd } from "src/microscopeApi/grabImageOnFrameEnd";
import {
  FinalSliceConfiguration,
  RibbonData,
  SliceConfiguration,
} from "src/types/canvas";
import { lerp } from "./canvas";
import { computeStageCoordinates, StageConfiguration } from "./semCoordinates";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const handleFinalImaging = async (details: {
  configurations: FinalSliceConfiguration[];
  onProgressUpdate: (percentDone: number) => void;
  scanSpeed: number;
}) => {
  const { configurations, onProgressUpdate, scanSpeed } = details;
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

const interpolateConfigurations = (
  userConfigurations: SliceConfiguration[]
) => {
  const interpolatedConfigurations: SliceConfiguration[] = [];
  for (let i = 0; i < userConfigurations.length; i++) {
    const configA = userConfigurations[i];
    interpolatedConfigurations.push(configA);
    if (i === userConfigurations.length - 1) break;
    const configB = userConfigurations[i + 1];
    for (let j = configA.index + 1; j < configB.index; j++) {
      const percent = (j - configA.index) / (configB.index - configA.index);
      const brightness = lerp(
        configA.brightness || 0,
        configB.brightness || 0,
        percent
      );
      const contrast = lerp(
        configA.contrast || 0,
        configB.contrast || 0,
        percent
      );
      const focus = lerp(configA.focus || 0, configB.focus || 0, percent);
      interpolatedConfigurations.push({
        index: j,
        brightness,
        contrast,
        focus,
      });
    }
  }
  return interpolatedConfigurations;
};

export const setupFinalConfigurations = (details: {
  magnification: number;
  ribbon: RibbonData;
  canvasConfiguration: {
    width: number;
    height: number;
  };
  stageConfiguration: StageConfiguration;
  ribbonId: number;
}): FinalSliceConfiguration[] => {
  const interpolatedConfigurations = interpolateConfigurations(
    details.ribbon.configurations
  );
  const ribbonName = details.ribbon.name
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase();
  return interpolatedConfigurations.map((c) => {
    const point = computeStageCoordinates({
      point: details.ribbon.matchedPoints[c.index],
      canvasConfiguration: details.canvasConfiguration,
      stageConfiguration: details.stageConfiguration,
    });
    return {
      magnification: details.magnification,
      brightness: c.brightness!,
      contrast: c.contrast!,
      focus: c.focus!,
      label: `slice-${c.index + 1}`,
      point,
      ribbonId: details.ribbonId,
      ribbonName,
    };
  });
};
