import { grabImageOnFrameEnd } from "src/MicroscopeBridge/grabImageOnFrameEnd";
import { microscopeBridge } from "src/MicroscopeBridge/index";
import {
  FinalRibbonConfiguration,
  FinalShapeConfiguration,
  ShapeConfiguration,
  ShapeSet,
} from "src/SliceManager/types";
import { StageConfiguration } from "./computeStageCoordinates";
import { lerp } from "./interpolation";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const handleFinalImaging = async (details: {
  configurations: FinalRibbonConfiguration[];
  onProgressUpdate: (sliceCount: number) => void;
  scanSpeed: number;
}) => {
  const { configurations, onProgressUpdate, scanSpeed } = details;
  onProgressUpdate(0);
  const sliceConfigurations = configurations.map((c) => c.slices).flat();
  if (sliceConfigurations.length === 0)
    return alert("No configurations received. Please try again.");
  await microscopeBridge.grabFullFrame({
    temporary: false,
    ribbonId: configurations[0].ribbon.id,
    ribbonName: configurations[0].ribbon.name,
    filename: "",
    name: "setup",
  });
  await sleep(500);
  await microscopeBridge.setMagnification(sliceConfigurations[0].magnification);
  await sleep(500);
  await microscopeBridge.setDetectorType("ZOOMED_IN");
  await sleep(500);
  await microscopeBridge.setScanSpeed(scanSpeed);
  await sleep(500);
  await microscopeBridge.setImageQuality("HIGH");
  await sleep(3000);
  for (let i = 0; i < sliceConfigurations.length; i++) {
    onProgressUpdate(i);
    const config = sliceConfigurations[i];
    await microscopeBridge.moveStageTo({
      x: config.point[0],
      y: config.point[1],
    });
    await sleep(500);
    await microscopeBridge.setBrightness(config.brightness);
    await sleep(500);
    await microscopeBridge.setContrast(config.contrast);
    await sleep(500);
    await microscopeBridge.setWorkingDistance(config.focus);
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
  onProgressUpdate(sliceConfigurations.length);
};

const interpolateConfigurations = (
  allConfigurations: ShapeConfiguration[],
  manualConfigurations: ShapeConfiguration["id"][]
) => {
  const anchorConfigurations = allConfigurations.filter((config) =>
    manualConfigurations.includes(config.id)
  );
  const interpolatedConfigurations: ShapeConfiguration[] = [];
  for (let i = 0; i < anchorConfigurations.length; i++) {
    const configA = anchorConfigurations[i];
    interpolatedConfigurations.push(configA);
    if (i === anchorConfigurations.length - 1) break;
    const configB = anchorConfigurations[i + 1];
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
        id: allConfigurations[j].id,
        index: j,
        brightness,
        contrast,
        focus,
        point: allConfigurations[j].point,
      });
    }
  }
  return interpolatedConfigurations;
};

export const setupFinalConfigurations = (details: {
  magnification: number;
  ribbon: ShapeSet;
  canvasConfiguration: {
    width: number;
    height: number;
  };
  stageConfiguration: StageConfiguration;
  ribbonId: number;
}): FinalShapeConfiguration[] => {
  const interpolatedConfigurations = interpolateConfigurations(
    details.ribbon.configurations,
    details.ribbon.slicesToConfigure
  );
  const ribbonName = details.ribbon.name
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase();
  return interpolatedConfigurations.map((c) => {
    return {
      magnification: details.magnification,
      brightness: c.brightness!,
      contrast: c.contrast!,
      focus: c.focus!,
      label: `slice-${c.index + 1}`,
      point: c.point,
      ribbonId: details.ribbonId,
      ribbonName,
    };
  });
};
