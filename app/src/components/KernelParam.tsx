import { createEffect, createSignal, untrack } from "solid-js";

export const KernelParam = (props: {
  values: number[];
  onChange: (values: number[]) => void;
}) => {
  const [cornerVal, setCornerVal] = createSignal(props.values[0]);
  const [edgeVal, setEdgeVal] = createSignal(props.values[1]);
  const [centerVal, setCenterVal] = createSignal(props.values[2]);

  let corners!: HTMLInputElement;
  let edges!: HTMLInputElement;
  let center!: HTMLInputElement;

  createEffect(() => {
    const [latestCorner, latestEdge, latestCenter] = props.values;
    untrack(() => {
      if (latestCorner !== cornerVal()) setCornerVal(props.values[0]);
      if (latestEdge !== edgeVal()) setEdgeVal(props.values[1]);
      if (latestCenter !== centerVal()) setCenterVal(props.values[2]);
    });
  });

  const changed = () => {
    return (
      cornerVal() !== props.values[0] ||
      edgeVal() !== props.values[1] ||
      centerVal() !== props.values[2]
    );
  };

  return (
    <div class="flex flex-row items-center gap-2">
      <label class="font-bold">Gaussian Kernel</label>
      <div class="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, index) => {
          if (index === 0 || index === 1 || index === 4) {
            return (
              <input
                type="number"
                class="text-center"
                value={
                  index === 0
                    ? cornerVal()
                    : index === 4
                    ? centerVal()
                    : edgeVal()
                }
                ref={index === 0 ? corners : index === 4 ? center : edges}
                onChange={(e) => {
                  if (index === 0)
                    setCornerVal(parseFloat(e.currentTarget.value));
                  if (index === 1)
                    setEdgeVal(parseFloat(e.currentTarget.value));
                  if (index === 4)
                    setCenterVal(parseFloat(e.currentTarget.value));
                }}
              />
            );
          }
          return (
            <div class="flex items-center justify-center">
              {index % 2 === 1
                ? edgeVal()
                : index === 4
                ? centerVal()
                : cornerVal()}
            </div>
          );
        })}
      </div>
      <button
        onClick={() => {
          props.onChange([cornerVal(), edgeVal(), centerVal()]);
        }}
        class="text-white font-bold py-2 px-4 rounded"
        classList={{
          "bg-orange-500 hover:bg-orange-700": changed(),
          "bg-blue-500 hover:bg-blue-700": !changed(),
        }}
      >
        Set
      </button>
    </div>
  );
};
