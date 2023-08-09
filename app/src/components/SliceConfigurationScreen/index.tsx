import { RibbonData } from "@data/shapes";
import { computeStageCoordinates } from "@logic/semCoordinates";
import { microscopeBridge } from "@microscopeBridge/index";
import { createEffect, createSignal, Show, untrack } from "solid-js";
import {
  BRIGHTNESS_STEP,
  CONTRAST_STEP,
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
    RibbonData["id"] | null
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
    await microscopeBridge.moveStageTo(coordinates);
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
      await microscopeBridge.moveStageTo(coordinates);
    });
  });

  const configuration = () =>
    ribbon().configurations[ribbonReducer().focusedSliceIndex]!;

  const ribbon = () =>
    ribbonReducer().ribbons.find(
      (r) => r.id === ribbonReducer().focusedRibbonId
    )!;

  return (
    <div class="flex flex-col gap-2 items-center">
      <SliceGrouper />
      <div class='border-[1px] border-t-[#888] h-1 w-full my-6' />
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
          Configuring Slice {ribbonReducer().focusedSliceIndex + 1} of{" "}
          {ribbon().slices.length}
        </span>
        <div>
          <Show
            when={
              ribbonReducer().focusedSliceIndex >= ribbon().slices.length - 1
            }
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
      <SliderPicker
        label="Magnification (applies to all slices)"
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
      <div class="flex flex-col my-2 ml-6">
        <span class="-ml-4 mb-4 font-bold text-lg">
          Slice {ribbonReducer().focusedSliceIndex + 1} Configuration
        </span>
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
      </div>
    </div>
  );
};
