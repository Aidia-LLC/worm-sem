import { sleep } from "@logic/finalImaging";
import { computeStageCoordinates } from "@logic/semCoordinates";
import { createEffect, createSignal, onMount, Show, untrack } from "solid-js";
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
import { microscopeApi } from "src/microscopeApi";
import { Button } from "../Button";
import { SliderPicker } from "../SliderPicker";

export const SliceConfigurationScreen = () => {
  const [magnification, setMagnification] = magnificationSignal;
  const [scanSpeed, setScanSpeed] = scanSpeedSignal;
  const [ribbonReducer, ribbonDispatch] = ribbonState;
  const [stage] = initialStageSignal;
  const [primaryImage] = primaryImageSignal;
  const [initialStage] = initialStageSignal;

  const [brightness, setBrightness] = createSignal<number | null>(null);
  const [contrast, setContrast] = createSignal<number | null>(null);
  const [focus, setFocus] = createSignal<number | null>(null);

  onMount(async () => {
    const brightness = await microscopeApi.getBrightness();
    const contrast = await microscopeApi.getContrast();
    const focus = await microscopeApi.getWorkingDistance();

    setBrightness(brightness);
    setContrast(contrast);
    setFocus(focus);

    const ribbon = ribbonReducer().ribbons.find(
      (ribbon) => ribbon.id === ribbonReducer().focusedRibbonId
    )!;
    const point = ribbon.matchedPoints[0];

    const coordinates = computeStageCoordinates({
      point,
      canvasConfiguration: primaryImage()!.size!,
      stageConfiguration: stage()!,
    });

    await sleep(500);
    await microscopeApi.setDetectorType("ZOOMED_IN");
    await microscopeApi.moveStageTo(coordinates);
    await microscopeApi.setMagnification(magnification());
    await microscopeApi.setScanSpeed(scanSpeed());
    await microscopeApi.setFrozen(false);
  });

  createEffect(() => {
    ribbonReducer().focusedSliceIndex;
    untrack(() => {
      handleMoveStageToSlice();
    });
  });

  const handleMoveStageToSlice = async () => {
    const ribbon = ribbonReducer().ribbons.find(
      (ribbon) => ribbon.id === ribbonReducer().focusedRibbonId
    )!;
    const point = ribbon.matchedPoints[ribbonReducer().focusedSliceIndex];
    const coordinates = computeStageCoordinates({
      point,
      canvasConfiguration: primaryImage()!.size!,
      stageConfiguration: initialStage()!,
    });
    await sleep(200);
    await microscopeApi.moveStageTo(coordinates);
  };

  return (
    <div class="flex flex-col gap-2 items-center">
      <div class="flex flex-row gap-2 items-center justify-between">
        <div
          classList={{
            invisible: ribbonReducer().focusedSliceIndex === 0,
          }}
        >
          <Button
            onClick={() => {
              if (ribbonReducer().focusedSliceIndex <= 0) return;
              ribbonDispatch({
                action: "setFocusedSliceIndex",
                payload: ribbonReducer().focusedSliceIndex - 1,
              });
            }}
          >
            Previous Slice
          </Button>
        </div>
        <span>
          Configuring Slice {ribbonReducer().focusedSliceIndex + 1} of{" "}
          {ribbonReducer().ribbons.length}
        </span>
        <Button
          onClick={() => {
            if (
              ribbonReducer().focusedSliceIndex >=
              ribbonReducer().ribbons.length - 1
            ) {
              ribbonDispatch({
                action: "setGrabbing",
                payload: true,
              });
              return;
            }
            ribbonDispatch({
              action: "setFocusedSliceIndex",
              payload: ribbonReducer().focusedSliceIndex + 1,
            });
          }}
        >
          <Show
            when={
              ribbonReducer().focusedSliceIndex >=
              ribbonReducer().ribbons.length - 1
            }
            fallback="Next Slice"
          >
            Finish
          </Show>
        </Button>
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
          await microscopeApi.setMagnification(value);
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
          await microscopeApi.setScanSpeed(value);
        }}
      />
      <div class="flex flex-col my-2 ml-6">
        <span class="-ml-4 mb-4 font-bold text-lg">
          Slice {ribbonReducer().focusedSliceIndex + 1} Configuration
        </span>
        <SliderPicker
          label="Brightness"
          value={brightness() || 0}
          min={0}
          max={100}
          step={BRIGHTNESS_STEP}
          setValue={async (value) => {
            setBrightness(value);
            await microscopeApi.setBrightness(value);
            ribbonDispatch({
              action: "updateSliceConfiguration",
              payload: { brightness: value },
            });
          }}
          unit="%"
        />
        <SliderPicker
          label="Contrast"
          unit="%"
          value={contrast() || 0}
          min={0}
          max={100}
          step={CONTRAST_STEP}
          setValue={async (value) => {
            setContrast(value);
            await microscopeApi.setContrast(value);
            ribbonDispatch({
              action: "updateSliceConfiguration",
              payload: { contrast: value },
            });
          }}
        />
        <SliderPicker
          label="Working Distance"
          unit="m"
          value={focus() || 0}
          min={MIN_WORKING_DISTANCE}
          max={MAX_WORKING_DISTANCE}
          step={WORKING_DISTANCE_STEP}
          setValue={async (value) => {
            setFocus(value);
            await microscopeApi.setWorkingDistance(value);
            ribbonDispatch({
              action: "updateSliceConfiguration",
              payload: { focus: value },
            });
          }}
        />
      </div>
    </div>
  );
};
