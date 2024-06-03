import { ProcessingOptions } from "@data/ProcessingOptions";
import { createStore, SetStoreFunction } from "solid-js/store";

export const defaultOptions: ProcessingOptions = {
  sensitivity: 4,
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
