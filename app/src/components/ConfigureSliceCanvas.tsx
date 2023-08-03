import { sleep } from "@logic/handleFinalImaging";
import {
  computeStageCoordinates,
  StageConfiguration,
} from "@logic/semCoordinates";
import { createSignal, onMount, Show } from "solid-js";
import {
  magnificationSignal,
  MAX_MAG,
  scanSpeedSignal,
} from "src/data/signals/globals";
import { microscopeApi } from "src/microscopeApi";
import { RibbonData, SliceConfiguration } from "src/types/canvas";
import { Button } from "./Button";
import { SliderPicker } from "./SliderPicker";

export const ConfigureSliceCanvas = (props: {
  ribbon: RibbonData;
  configuration: SliceConfiguration;
  setConfiguration: (config: Partial<SliceConfiguration>) => void;
  onNext: () => void;
  onPrevious: () => void;
  canvas: HTMLCanvasElement;
  stage: StageConfiguration;
}) => {
  const [magnification, setMagnification] = magnificationSignal;
  const [scanSpeed, setScanSpeed] = scanSpeedSignal;

  const [brightness, setBrightness] = createSignal<number | null>(null);
  const [contrast, setContrast] = createSignal<number | null>(null);
  const [focus, setFocus] = createSignal<number | null>(null);

  onMount(async () => {
    if (!props.configuration) return;

    const brightness = await microscopeApi.getBrightness();
    const contrast = await microscopeApi.getContrast();
    const focus = await microscopeApi.getWorkingDistance();

    setBrightness(brightness);
    setContrast(contrast);
    setFocus(focus);

    const point = props.ribbon.matchedPoints[props.configuration.index];

    const coordinates = computeStageCoordinates({
      point,
      canvasConfiguration: props.canvas,
      stageConfiguration: props.stage,
    });

    await sleep(500);
    await microscopeApi.setDetectorType("ZOOMED_IN");
    await microscopeApi.moveStageTo(coordinates);
    await microscopeApi.setMagnification(magnification());
    await microscopeApi.setScanSpeed(scanSpeed());
    await microscopeApi.setFrozen(false);
  });

  return (
    <div class="flex flex-col gap-2 items-center">
      <div class="flex flex-row gap-2 items-center justify-between">
        <div
          classList={{
            invisible: props.configuration.index === 0,
          }}
        >
          <Button onClick={props.onPrevious}>Previous Slice</Button>
        </div>
        <span>
          Configuring Slice {props.configuration.index + 1} of{" "}
          {props.ribbon.trapezoids.length}
        </span>
        <Button onClick={props.onNext}>
          <Show
            when={
              props.configuration.index === props.ribbon.trapezoids.length - 1
            }
            fallback="Next Slice"
          >
            Finish
          </Show>
        </Button>
      </div>
      <SliderPicker
        label="Magnification (applies to all slices)"
        value={magnification()}
        min={40}
        max={MAX_MAG}
        step={1}
        setValue={async (value) => {
          setMagnification(value);
          await microscopeApi.setMagnification(value);
        }}
        unit="x"
      />
      <SliderPicker
        label="Scan Speed"
        value={scanSpeed()}
        min={1}
        max={10}
        setValue={async (value) => {
          setScanSpeed(value);
          await microscopeApi.setScanSpeed(value);
        }}
        step={1}
        unit=""
      />
      <div class="flex flex-col my-2 ml-6">
        <span class="-ml-4 mb-4 font-bold text-lg">
          Slice {props.configuration.index + 1} Configuration
        </span>
        <SliderPicker
          label="Brightness"
          value={brightness() || 0}
          min={0}
          max={100}
          step={0.0001}
          setValue={(value) => {
            setBrightness(value);
            props.setConfiguration({ brightness: value });
          }}
          unit="%"
        />
        <SliderPicker
          label="Contrast"
          value={contrast() || 0}
          min={0}
          max={100}
          step={0.0001}
          setValue={(value) => {
            setContrast(value);
            props.setConfiguration({ contrast: value });
          }}
          unit="%"
        />
        <SliderPicker
          label="Working Distance"
          value={focus() || 0}
          min={0}
          max={0.003}
          step={0.000001}
          setValue={(value) => {
            setFocus(value);
            props.setConfiguration({ focus: value });
          }}
          unit="m"
        />
      </div>
    </div>
  );
};
