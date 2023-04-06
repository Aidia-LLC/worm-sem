import { createEffect, createSignal, untrack } from "solid-js";

export const Param = (props: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => {
  const [currentValue, setCurrentValue] = createSignal(props.value);

  createEffect(() => {
    const propValue = props.value;
    untrack(() => {
      if (propValue !== currentValue()) setCurrentValue(props.value);
    });
  });

  let inputRef!: HTMLInputElement;

  return (
    <div class="flex flex-row items-center gap-2">
      <label class="font-bold">{props.label}</label>
      <input
        type="number"
        value={props.value}
        class="w-full"
        ref={inputRef}
        onChange={(e) => setCurrentValue(parseFloat(e.currentTarget.value))}
      />
      <button
        onClick={() => props.onChange(currentValue())}
        class="text-white font-bold py-2 px-4 rounded"
        classList={{
          "bg-orange-500 hover:bg-orange-700": props.value !== currentValue(),
          "bg-blue-500 hover:bg-blue-700": props.value === currentValue(),
        }}
      >
        Set
      </button>
    </div>
  );
};
