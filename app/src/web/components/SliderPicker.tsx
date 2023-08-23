import { Show, createEffect } from "solid-js";

export const SliderPicker = (props: {
  label: string;
  value: number;
  setValue: (value: number) => void;
  min: number;
  max: number;
  unit?: string;
  step: number;
  hideSlider?: boolean;
  waitUntilOnChanged?: boolean;
}) => {
  const inputHandler = (e: (InputEvent | Event) & {
    currentTarget: HTMLInputElement;
    target: Element;
  }) => {
    let v = e.currentTarget.valueAsNumber
    if (isNaN(v)) {
      v = parseFloat(e.currentTarget.value + '0')
      if (isNaN(v)) return
    }
    props.setValue(v)
  }
  const handler = () => {
    return props.waitUntilOnChanged ? {
      onInput: inputHandler
    } : {
      onChange: inputHandler
    }
  }
  let inputRef1!: HTMLInputElement
  let inputRef2!: HTMLInputElement

  createEffect(() => {
    const v = props.value.toString()
    inputRef1.value = v
    inputRef2.value = v
  })
  return (
    <div class="flex flex-col gap-2 w-full max-w-[512px] mx-auto">
      <span class="font-bold">{props.label}</span>
      <div class="grid grid-cols-2 w-full gap-2">
        <Show when={!props.hideSlider}>
          <input
            type="range"
            min={props.min}
            max={props.max}
            step={props.step}
            {...handler()}

          />
        </Show>
        <div
          class="flex flex-row items-center gap-2"
          classList={{
            "col-span-2": props.hideSlider,
          }}
        >
          <input
            type="number"
            min={props.min}
            max={props.max}
            step={props.step}
            class="w-full"
            {...handler()}
          />
          <Show when={props.unit}>
            <span>{props.unit}</span>
          </Show>
        </div>
      </div>
    </div>
  );
};
