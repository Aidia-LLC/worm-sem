import { sleep } from "@logic/handleFinalImaging";
import {
  computeStageCoordinates,
  StageConfiguration,
} from "@logic/semCoordinates";
import { createSignal, onMount, Show } from "solid-js";
import { MAX_MAG } from "src/data/magnification";
import {
  DETECTOR_TYPE_STEM_A_ZOOMED_IN,
  getSEMParam,
  MEDIUM_SCAN_SPEED,
} from "src/data/semParams";
import { getNextCommandId } from "src/data/signals/commandQueue";
import { RibbonData, SliceConfiguration } from "src/types/canvas";
import { Button } from "./Button";
import { SliderPicker } from "./SliderPicker";

export const ConfigureSliceCanvas = (props: {
  ribbon: RibbonData;
  magnification: number;
  setMagnification: (magnification: number) => void;
  scanSpeed: number;
  setScanSpeed: (value: number) => void;
  configuration: SliceConfiguration;
  setConfiguration: (config: Partial<SliceConfiguration>) => void;
  onNext: () => void;
  onPrevious: () => void;
  canvas: HTMLCanvasElement;
  stage: StageConfiguration;
}) => {
  const [brightness, setBrightness] = createSignal<number | null>(null);
  const [contrast, setContrast] = createSignal<number | null>(null);
  const [focus, setFocus] = createSignal<number | null>(null);

  onMount(async () => {
    if (!props.configuration) return;

    const brightness = await getSEMParam("AP_BRIGHTNESS");
    const contrast = await getSEMParam("AP_CONTRAST");
    const focus = await getSEMParam("AP_WD");

    setBrightness(parseFloat(brightness));
    setContrast(parseFloat(contrast));
    setFocus(parseFloat(focus));

    const point = props.ribbon.matchedPoints[props.configuration.index];

    const coordinates = computeStageCoordinates({
      point,
      canvasConfiguration: props.canvas,
      stageConfiguration: props.stage,
    });

    await sleep(1000);

    window.semClient.send({
      id: getNextCommandId(),
      type: "setParam",
      param: "DP_DETECTOR_TYPE",
      doubleValue: DETECTOR_TYPE_STEM_A_ZOOMED_IN,
    });
    await sleep(1000);

    window.semClient.send({
      type: "setParam",
      id: getNextCommandId(),
      param: "AP_STAGE_GOTO_X",
      doubleValue: coordinates.x,
    });
    await sleep(500);

    window.semClient.send({
      type: "setParam",
      id: getNextCommandId(),
      param: "AP_STAGE_GOTO_Y",
      doubleValue: coordinates.y,
    });
    await sleep(500);

    window.semClient.send({
      type: "setParam",
      id: getNextCommandId(),
      param: "AP_MAG",
      doubleValue: props.magnification,
    });
    await sleep(500);

    window.semClient.send({
      type: "execute",
      id: getNextCommandId(),
      command: `CMD_SCANRATE${MEDIUM_SCAN_SPEED}`,
    });
    await sleep(500);

    window.semClient.send({
      id: getNextCommandId(),
      type: "setParam",
      param: "DP_FROZEN",
      doubleValue: 0,
    });
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
        value={props.magnification || 1}
        min={40}
        max={MAX_MAG}
        step={1}
        setValue={(value) => {
          props.setMagnification(value);
          window.semClient.send({
            type: "setParam",
            id: getNextCommandId(),
            param: "AP_MAG",
            doubleValue: value,
          });
        }}
        unit="x"
      />
      <SliderPicker
        label="Scan Speed"
        value={props.scanSpeed}
        min={1}
        max={10}
        setValue={(value) => props.setScanSpeed(value)}
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
