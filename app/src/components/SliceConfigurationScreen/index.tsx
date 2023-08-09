import { computeStageCoordinates } from "@logic/computeStageCoordinates";
import { createEffect, createSignal, Show, untrack } from "solid-js";
import {
  BRIGHTNESS_STEP,
  CONTRAST_STEP,
  DISTANCE_STEP,
  MAX_MAGNIFICATION,
  MAX_SCAN_SPEED,
  MAX_WORKING_DISTANCE,
  MIN_MAGNIFICATION,
  MIN_SCAN_SPEED,
  MIN_WORKING_DISTANCE,
  WORKING_DISTANCE_STEP,
} from "src/config";
import {
  initialStageSignal,
  magnificationSignal,
  primaryImageSignal,
  ribbonState,
  scanSpeedSignal,
} from "src/data/signals/globals";
import { microscopeBridge } from "src/MicroscopeBridge/index";
import { ShapeSet } from "src/SliceManager/types";
import { Button } from "../Button";
import { SliderPicker } from "../SliderPicker";
import { EnqueueRibbon } from "./EnqueueRibbon";
import { SliceGrouper } from "./InterpolationGrouper";

export const SliceConfigurationScreen = () => {
  const [magnification, setMagnification] = magnificationSignal;
  const [scanSpeed, setScanSpeed] = scanSpeedSignal;
  const [ribbonReducer, ribbonDispatch] = ribbonState;
  const [stage] = initialStageSignal;
  const [primaryImage] = primaryImageSignal;

  const [initializedRibbonId, setInitializedRibbonId] = createSignal<
    ShapeSet["id"] | null
  >(null);

  createEffect(async () => {
    const focusedRibbonId = ribbonReducer().focusedRibbonId;
    const focusedSliceIndex = ribbonReducer().focusedSliceIndex;
    if (
      focusedRibbonId === null ||
      focusedSliceIndex === -1 ||
      initializedRibbonId() === focusedRibbonId
    )
      return;

    setInitializedRibbonId(focusedRibbonId);

    const brightness = await microscopeBridge.getBrightness();
    const contrast = await microscopeBridge.getContrast();
    const focus = await microscopeBridge.getWorkingDistance();

    ribbonDispatch({
      action: "updateSliceConfiguration",
      payload: {
        brightness,
        contrast,
        focus,
      },
    });

    const ribbon = ribbonReducer().ribbons.find(
      (ribbon) => ribbon.id === ribbonReducer().focusedRibbonId
    )!;
    const point = ribbon.matchedPoints[0];

    const coordinates = computeStageCoordinates({
      point,
      canvasConfiguration: primaryImage()!.size!,
      stageConfiguration: stage()!,
    });

    await microscopeBridge.setDetectorType("ZOOMED_IN");
    await microscopeBridge.moveStageTo({
      x: coordinates[0],
      y: coordinates[1],
    });
    await microscopeBridge.setMagnification(magnification());
    await microscopeBridge.setScanSpeed(scanSpeed());
    await microscopeBridge.setFrozen(false);
  });

  createEffect(() => {
    const focusedSliceIndex = ribbonReducer().focusedSliceIndex;
    if (focusedSliceIndex === -1) return;
    untrack(async () => {
      const ribbon = ribbonReducer().ribbons.find(
        (ribbon) => ribbon.id === ribbonReducer().focusedRibbonId
      )!;
      const point = ribbon.matchedPoints[ribbonReducer().focusedSliceIndex];
      const coordinates = computeStageCoordinates({
        point,
        canvasConfiguration: primaryImage()!.size!,
        stageConfiguration: stage()!,
      });
      await microscopeBridge.moveStageTo({
        x: coordinates[0],
        y: coordinates[1],
      });

      if (!editingConfiguration()) return;
      const configuration = ribbon.configurations[focusedSliceIndex]!;
      if (configuration.brightness)
        await microscopeBridge.setBrightness(configuration.brightness);
      if (configuration.contrast)
        await microscopeBridge.setContrast(configuration.contrast);
      if (configuration.focus)
        await microscopeBridge.setWorkingDistance(configuration.focus);
    });
  });

  const configuration = () =>
    ribbon().configurations[ribbonReducer().focusedSliceIndex]!;

  const ribbon = () =>
    ribbonReducer().ribbons.find(
      (r) => r.id === ribbonReducer().focusedRibbonId
    )!;

  const hasNextRibbon = () =>
    ribbonReducer().focusedSliceIndex >= ribbon().slices.length - 1;

  const focusedSliceNum = () => ribbonReducer().focusedSliceIndex + 1;
  const editingConfiguration = () => {
    const r = ribbon();
    return r.slicesToConfigure.includes(
      r.slices[ribbonReducer().focusedSliceIndex]?.id ?? -1
    );
  };
  const editingPosition = () => {
    const r = ribbon();
    return r.slicesToMove.includes(
      r.slices[ribbonReducer().focusedSliceIndex]?.id ?? -1
    );
  };

  return (
    <div class="flex flex-col gap-2 items-center">
      <SliceGrouper />
      <div class="border-[1px] border-t-[#888] h-1 w-full my-6" />
      <div class="flex flex-row gap-4 items-center justify-center w-full">
        <div classList={{ invisible: ribbonReducer().focusedSliceIndex === 0 }}>
          <Button
            onClick={() => ribbonDispatch({ action: "focusPreviousSlice" })}
            class="whitespace-nowrap"
          >
            Previous Slice
          </Button>
        </div>
        <span class="font-bold text-xl">
          Configuring Slice {focusedSliceNum()} of {ribbon().slices.length}
        </span>
        <div>
          <Show
            when={hasNextRibbon()}
            fallback={
              <Button
                onClick={() => ribbonDispatch({ action: "focusNextSlice" })}
                class="whitespace-nowrap"
              >
                Next Slice
              </Button>
            }
          >
            <EnqueueRibbon />
          </Show>
        </div>
      </div>
      <div class="flex flex-col w-full items-center mb-16 gap-4">
        <div class="flex flex-col gap-4 bg-slate-200 rounded-xl p-4 w-full items-center shadow-lg border-slate-400 border-2">
          <h6 class="text-xl font-bold">Slice Configuration</h6>
          <Show when={editingConfiguration()}>
            <SliderPicker
              label="Brightness"
              value={configuration()?.brightness || 0}
              min={0}
              max={100}
              step={BRIGHTNESS_STEP}
              setValue={async (value) => {
                ribbonDispatch({
                  action: "updateSliceConfiguration",
                  payload: { brightness: value },
                });
                await microscopeBridge.setBrightness(value);
              }}
              unit="%"
            />
            <SliderPicker
              label="Contrast"
              unit="%"
              value={configuration()?.contrast || 0}
              min={0}
              max={100}
              step={CONTRAST_STEP}
              setValue={async (value) => {
                ribbonDispatch({
                  action: "updateSliceConfiguration",
                  payload: { contrast: value },
                });
                await microscopeBridge.setContrast(value);
              }}
            />
            <SliderPicker
              label="Working Distance"
              unit="m"
              value={configuration()?.focus || 0}
              min={MIN_WORKING_DISTANCE}
              max={MAX_WORKING_DISTANCE}
              step={WORKING_DISTANCE_STEP}
              setValue={async (value) => {
                ribbonDispatch({
                  action: "updateSliceConfiguration",
                  payload: { focus: value },
                });
                await microscopeBridge.setWorkingDistance(value);
              }}
            />
          </Show>

          <Show when={editingPosition()}>
            <SliderPicker
              label="X"
              unit="m"
              value={configuration()?.point[0] || 0}
              min={stage()?.limits.x[0] || 0}
              max={stage()?.limits.x[1] || 0}
              step={DISTANCE_STEP}
              hideSlider={true}
              setValue={async (value) => {
                ribbonDispatch({
                  action: "updateSliceConfiguration",
                  payload: { point: { x: value } },
                });
                await microscopeBridge.moveStageTo({
                  x: value,
                  y: configuration().point[1],
                });
              }}
            />
            <SliderPicker
              label="Y"
              unit="m"
              value={configuration()?.point[1] || 0}
              min={stage()?.limits.y[0] || 0}
              max={stage()?.limits.y[1] || 0}
              step={DISTANCE_STEP}
              hideSlider={true}
              setValue={async (value) => {
                ribbonDispatch({
                  action: "updateSliceConfiguration",
                  payload: { point: { y: value } },
                });
                await microscopeBridge.moveStageTo({
                  x: configuration().point[0],
                  y: value,
                });
              }}
            />
          </Show>
        </div>
        <div class="flex flex-col gap-4 bg-slate-200 rounded-xl p-4 w-full items-center shadow-lg border-slate-400 border-2">
          <h6 class="text-xl font-bold">Configuration Across All Slices</h6>
          <SliderPicker
            label="Magnification"
            unit="x"
            value={magnification()}
            min={MIN_MAGNIFICATION}
            max={MAX_MAGNIFICATION}
            step={1}
            setValue={async (value) => {
              setMagnification(value);
              await microscopeBridge.setMagnification(value);
            }}
          />
          <SliderPicker
            label="Scan Speed"
            value={scanSpeed()}
            min={MIN_SCAN_SPEED}
            max={MAX_SCAN_SPEED}
            step={1}
            setValue={async (value) => {
              setScanSpeed(value);
              await microscopeBridge.setScanSpeed(value);
            }}
          />
        </div>
      </div>
    </div>
  );
};
