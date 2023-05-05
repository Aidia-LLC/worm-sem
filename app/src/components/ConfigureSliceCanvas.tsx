import { SliceConfiguration, RibbonData } from "@dto/canvas";
import { base64ToImageSrc } from "@logic/image";
import {
  computeStageCoordinates,
  StageConfiguration,
} from "@logic/semCoordinates";
import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { MAX_MAG } from "src/data/magnification";
import { getSEMParam, MEDIUM_SCAN_SPEED } from "src/data/semParams";
import { getNextCommandId } from "src/data/signals/commandQueue";
import { Button } from "./Button";
import { SliderPicker } from "./SliderPicker";

const PREVIEW_INTERVAL = 3000;
const INITIAL_WAIT_INTERVAL = 5000;

export const ConfigureSliceCanvas = (props: {
  ribbon: RibbonData;
  magnification: number;
  setMagnification: (magnification: number) => void;
  configuration: SliceConfiguration;
  setConfiguration: (config: Partial<SliceConfiguration>) => void;
  onNext: () => void;
  onPrevious: () => void;
  canvas: HTMLCanvasElement;
  stage: StageConfiguration;
}) => {
  const [loading, setLoading] = createSignal(true);
  const [imageSrc, setImageSrc] = createSignal<string | null>(null);
  const [brightness, setBrightness] = createSignal<number | null>(null);
  const [contrast, setContrast] = createSignal<number | null>(null);
  const [focus, setFocus] = createSignal<number | null>(null);

  let canvasRef!: HTMLCanvasElement;
  let timerRef!: number;
  let unsubscribe!: VoidFunction;

  onMount(async () => {
    if (!props.configuration) return;
    unsubscribe = window.semClient.subscribe((message) => {
      if (message.type === "success" && message.code === 200) {
        setImageSrc(message.payload!);
        if (loading()) setLoading(false);
      }
    });

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

    window.semClient.send({
      type: "setParam",
      id: getNextCommandId(),
      param: "AP_STAGE_GOTO_X",
      doubleValue: coordinates.x,
    });

    window.semClient.send({
      type: "setParam",
      id: getNextCommandId(),
      param: "AP_STAGE_GOTO_Y",
      doubleValue: coordinates.y,
    });

    window.semClient.send({
      type: "setParam",
      id: getNextCommandId(),
      param: "AP_MAG",
      intValue: props.magnification,
    });

    window.semClient.send({
      type: "execute",
      id: getNextCommandId(),
      command: `CMD_SCANRATE${MEDIUM_SCAN_SPEED}`,
    });

    timerRef = window.setTimeout(() => {
      timerRef = window.setInterval(() => {
        window.semClient.send({
          type: "grabFullFrame",
          id: getNextCommandId(),
          name: "preview",
          reduction: -1,
          temporary: true,
        });
      }, PREVIEW_INTERVAL);
    }, INITIAL_WAIT_INTERVAL);
  });

  onCleanup(() => {
    unsubscribe?.();
    if (timerRef) clearInterval(timerRef);
  });

  createEffect(() => {
    const src = imageSrc();
    const context = canvasRef.getContext("2d")!;
    if (!src) return console.log("no image src");
    const img = new Image();
    img.onload = () => {
      canvasRef.width = img.width;
      canvasRef.height = img.height;
      context.clearRect(0, 0, canvasRef.width, canvasRef.height);
      context.drawImage(img, 0, 0);
    };
    img.src = base64ToImageSrc(src);
  });

  return (
    <div class="flex flex-col gap-2 items-center">
      <div class="flex flex-row gap-2 items-center justify-between">
        <div
          classList={{
            invisible: props.configuration.index === 0,
          }}
        >
          <Button disabled={!imageSrc()} onClick={props.onPrevious}>
            Previous Slice
          </Button>
        </div>
        <span>
          Configuring Slice {props.configuration.index + 1} of{" "}
          {props.ribbon.trapezoids.length}
        </span>
        <Button disabled={!imageSrc()} onClick={props.onNext}>
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
        min={1}
        max={MAX_MAG}
        setValue={(value) => {
          props.setMagnification(value);
          window.semClient.send({
            type: "setParam",
            id: getNextCommandId(),
            param: "AP_MAG",
            intValue: value,
          });
        }}
        unit="x"
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
          setValue={(value) => {
            setContrast(value);
            props.setConfiguration({ contrast: value });
          }}
          unit="%"
        />
        <SliderPicker
          label="Working Distance"
          value={focus() || 0}
          min={1}
          max={100}
          setValue={(value) => {
            setFocus(value);
            props.setConfiguration({ focus: value });
          }}
          unit="mm"
        />
      </div>
      <Show when={loading()}>Loading...</Show>
      <canvas
        ref={canvasRef}
        width="1000"
        height="1000"
        class="w-[clamp(300px,_100%,_85vh)] mx-auto"
      />
    </div>
  );
};
