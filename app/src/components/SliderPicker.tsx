export const SliderPicker = (props: {
  label: string;
  value: number;
  setValue: (value: number) => void;
  min: number;
  max: number;
  unit: string;
}) => {
  return (
    <div class="flex flex-col gap-2">
      <span class="font-bold">{props.label}</span>
      <div class="grid grid-cols-2 w-full gap-2">
        <input
          type="range"
          min={props.min}
          max={props.max}
          value={props.value}
          onChange={(e) => props.setValue(parseFloat(e.currentTarget.value))}
        />
        <div class="flex flex-row items-center gap-2">
          <input
            type="number"
            min={props.min}
            max={props.max}
            class="w-full"
            value={props.value}
            onChange={(e) => props.setValue(parseFloat(e.currentTarget.value))}
          />
          <span>{props.unit}</span>
        </div>
      </div>
    </div>
  );
};
