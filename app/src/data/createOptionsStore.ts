import { createStore, SetStoreFunction } from "solid-js/store";
import { ProcessingOptions } from "src/types/ProcessingOptions";

export const defaultOptions = {
  squareSize: 420,
  houghVoteThreshold: 0.5,
  mergeLineThreshold: 12,
  pixelThreshold: 0.35,
  maxLines: 6,
  minimumFit: 0.5,
  firstFit: 25,
};

export const createOptionsStore = (): [
  { options: ProcessingOptions },
  SetStoreFunction<{ options: ProcessingOptions }>,
  () => void
] => {
  const [options, setOptions] = createStore<{
    options: ProcessingOptions;
  }>({
    options: defaultOptions,
  });
  return [
    options,
    setOptions,
    () => {
      setOptions({ options: defaultOptions });
    },
  ];
};
