import { SliceConfiguration, TrapezoidSet } from "@dto/canvas";
import { base64ToImageSrc } from "@logic/image";
import {
  computeStageCoordinates,
  StageConfiguration,
} from "@logic/semCoordinates";
import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { getSEMParam } from "src/data/semParams";
import { getNextCommandId } from "src/data/signals/commandQueue";
import { Button } from "./Button";
import { SliderPicker } from "./SliderPicker";

const PREVIEW_INTERVAL = 1000;

export const ConfigureSliceCanvas = (props: {
  ribbon: TrapezoidSet;
  configuration: SliceConfiguration;
  setConfiguration: (config: Partial<SliceConfiguration>) => void;
  onNext: () => void;
  onPrevious: () => void;
  canvas: HTMLCanvasElement;
}) => {
  const [imageSrc, setImageSrc] = createSignal<string | null>(null);
  const [brightness, setBrightness] = createSignal<number | null>(null);
  const [contrast, setContrast] = createSignal<number | null>(null);
  const [initialStage, setInitialStage] =
    createSignal<StageConfiguration | null>(null);

  let canvasRef!: HTMLCanvasElement;
  let timerRef!: number;
  let unsubscribe!: VoidFunction;

  onMount(async () => {
    unsubscribe = window.semClient.subscribe((message) => {
      if (message.type !== "success" || message.code !== 200) return;
      setImageSrc(message.payload!);
    });

    timerRef = window.setInterval(() => {
      // TODO fetch live preview
    }, PREVIEW_INTERVAL);

    const brightness = await getSEMParam("AP_BRIGHTNESS");
    const contrast = await getSEMParam("AP_CONTRAST");
    const stageX = await getSEMParam("AP_STAGE_AT_X");
    const stageY = await getSEMParam("AP_STAGE_AT_Y");
    const stageLowLimitX = await getSEMParam("AP_STAGE_LOW_X");
    const stageLowLimitY = await getSEMParam("AP_STAGE_LOW_Y");
    const stageHighLimitX = await getSEMParam("AP_STAGE_HIGH_X");
    const stageHighLimitY = await getSEMParam("AP_STAGE_HIGH_Y");
    const fieldOfViewWidth = await getSEMParam("AP_WIDTH");
    const fieldOfViewHeight = await getSEMParam("AP_HEIGHT");

    setInitialStage({
      x: parseFloat(stageX),
      y: parseFloat(stageY),
      width: parseFloat(fieldOfViewWidth),
      height: parseFloat(fieldOfViewHeight),
      limits: {
        x: [parseFloat(stageLowLimitX), parseFloat(stageHighLimitX)],
        y: [parseFloat(stageLowLimitY), parseFloat(stageHighLimitY)],
      },
    });
    setBrightness(parseFloat(brightness));
    setContrast(parseFloat(contrast));

    const point = props.ribbon.matchedPoints[props.configuration.index];

    const coordinates = computeStageCoordinates({
      point,
      canvasConfiguration: props.canvas,
      stageConfiguration: initialStage()!,
    });

    console.log(coordinates);

    window.semClient.send({
      type: "setParam",
      id: getNextCommandId(),
      param: "AP_STAGE_GOTO_X",
      value: coordinates.x,
    });

    window.semClient.send({
      type: "setParam",
      id: getNextCommandId(),
      param: "AP_STAGE_GOTO_Y",
      value: coordinates.y,
    });
  });

  onCleanup(() => {
    unsubscribe();
    clearInterval(timerRef);
  });

  createEffect(() => {
    const src = imageSrc();
    const context = canvasRef.getContext("2d")!;
    context.clearRect(0, 0, canvasRef.width, canvasRef.height);
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
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
      <canvas ref={canvasRef} />
    </div>
  );
};
