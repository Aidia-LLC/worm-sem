import { createEffect, createSignal, onCleanup, untrack } from "solid-js";
import { Tooltip } from "../Tooltip";

const DEBOUNCE_TIME = 1000;

export const Param = (props: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  tooltipPosition?: "right" | "bottom";
}) => {
  const [currentValue, setCurrentValue] = createSignal(props.value);

  createEffect(() => {
    const propValue = props.value;
    untrack(() => {
      if (propValue !== currentValue()) setCurrentValue(props.value);
    });
  });

  let inputRef!: HTMLInputElement;
  let timerRef: any;

  const handleChange = () => {
    const value = parseFloat(inputRef.value);
    setCurrentValue(value);
    if (timerRef) clearTimeout(timerRef);
    timerRef = setTimeout(() => {
      props.onChange(value);
    }, DEBOUNCE_TIME);
  };

  onCleanup(() => {
    if (timerRef) clearTimeout(timerRef);
  });

  return (
    <div class="flex flex-row items-center gap-2">
      <label class="font-bold flex flex-row gap-2 items-center">
        <span class="min-w-[96px]">{props.label}</span>
        <Tooltip
          message={props.description}
          position={props.tooltipPosition || "bottom"}
        >
          <svg
            width="24px"
            height="24px"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
              stroke="#323232"
              stroke-width="2"
            />
            <path
              d="M10.5 8.67709C10.8665 8.26188 11.4027 8 12 8C13.1046 8 14 8.89543 14 10C14 10.9337 13.3601 11.718 12.4949 11.9383C12.2273 12.0064 12 12.2239 12 12.5V12.5V13"
              stroke="#323232"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M12 16H12.01"
              stroke="#323232"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </Tooltip>
      </label>
      <input
        type="number"
        value={props.value}
        class="w-full"
        ref={inputRef}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (timerRef) clearTimeout(timerRef);
            const value = parseFloat(inputRef.value);
            setCurrentValue(value);
            props.onChange(value);
          }
        }}
      />
    </div>
  );
};
