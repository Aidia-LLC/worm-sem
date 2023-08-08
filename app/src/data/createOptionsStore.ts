import { createStore, SetStoreFunction } from "solid-js/store";
import { ProcessingOptions } from "@data/ProcessingOptions";

export const defaultOptions: ProcessingOptions = {
  squareSize: 420,
  houghVoteThreshold: 0.4,
  mergeLineThreshold: 120,
  pixelThreshold: 0.35,
  maxLines: 6,
  minimumFit: 0.4,
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
