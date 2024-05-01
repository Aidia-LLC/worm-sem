import { detectionTypeSignal } from "@data/globals";
import { grabImageOnFrameEnd } from "@MicroscopeBridge/grabImageOnFrameEnd";
import { microscopeBridge } from "@MicroscopeBridge/index";
import {
  FinalRibbonConfiguration,
  FinalShapeConfiguration,
  ShapeConfiguration,
  ShapeSet,
} from "@SliceManager/types";
import {
  computeStageCoordinates,
  StageConfiguration,
} from "./computeStageCoordinates";
import { lerp } from "./interpolation";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const handleFinalImaging = async (details: {
  configurations: FinalRibbonConfiguration[];
  onProgressUpdate: (sliceCount: number) => void;
  scanSpeed: number;
}) => {
  const [detectionType] = detectionTypeSignal;
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
  await microscopeBridge.setDetectorType(detectionType());
  await sleep(500);
  await microscopeBridge.setImageQuality("HIGH");
  await sleep(3000);
  let i = 0;
  for (const ribbonConfig of configurations) {
    await microscopeBridge.moveStageTo({
      x: ribbonConfig.stage.x,
      y: ribbonConfig.stage.y,
      r: ribbonConfig.stage.r,
    });
    for (const sliceConfig of ribbonConfig.slices) {
      onProgressUpdate(i++);
      await microscopeBridge.moveStageTo({
        x: sliceConfig.point[0],
        y: sliceConfig.point[1],
      });
      await sleep(2500);
      await microscopeBridge.setBrightness(sliceConfig.brightness);
      await sleep(500);
      await microscopeBridge.setContrast(sliceConfig.contrast);
      await sleep(500);
      await microscopeBridge.setWorkingDistance(sliceConfig.focus);
      await sleep(500);
      // await microscopeBridge.autoBrightnessAndContrast();
      // await sleep(500);
      // await microscopeBridge.setScanSpeed(4);
      // await microscopeBridge.setFrozen(false);
      // await sleep(1000);
      // await microscopeBridge.autoFocusFine();
      await microscopeBridge.setScanSpeed(scanSpeed);
      await sleep(5000);
      await grabImageOnFrameEnd(
        {
          name: sliceConfig.label,
          temporary: false,
          ribbonId: sliceConfig.ribbonId,
          ribbonName: sliceConfig.ribbonName,
        },
        {
          minSleepMs: 60_000,
          pollIntervalMs: 5_000,
        }
      );
    }
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
        paramsTouched: false,
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
  return interpolatedConfigurations.map((c, i) => {
    const point = computeStageCoordinates({
      canvasConfiguration: details.canvasConfiguration,
      stageConfiguration: details.stageConfiguration,
      point: details.ribbon.matchedPoints[i],
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
