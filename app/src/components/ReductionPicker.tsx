export const ReductionPicker = (props: {
  value: number;
  onChange: (val: number) => void;
}) => {
  return (
    <div class="flex flex-col gap-3">
      <span class="font-bold text-md">Reduction</span>
      <div class="flex flex-col gap-2 text-md ml-3">
        <label class="flex flex-row items-center gap-2">
          <input
            type="radio"
            name="reduction"
            onChange={() => props.onChange(-1)}
            checked={props.value === -1}
          />
          Overlay Plane
        </label>
        <label class="flex flex-row items-center gap-2">
          <input
            type="radio"
            name="reduction"
            onChange={() => props.onChange(0)}
            checked={props.value === 0}
          />
          No Subsampling
        </label>
        <label class="flex flex-row items-center gap-2">
          <input
            type="radio"
            name="reduction"
            onChange={() => props.onChange(1)}
            checked={props.value === 1}
          />
          1:2
        </label>
        <label class="flex flex-row items-center gap-2">
          <input
            type="radio"
            name="reduction"
            onChange={() => props.onChange(2)}
            checked={props.value === 2}
          />
          1:3
        </label>
        <label class="flex flex-row items-center gap-2">
          <input
            type="radio"
            name="reduction"
            onChange={() => props.onChange(3)}
            checked={props.value === 3}
          />
          1:4
        </label>
      </div>
    </div>
  );
};
