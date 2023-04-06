import { ProcessingOptions } from "@dto/ProcessingOptions";
import { createStore, SetStoreFunction } from "solid-js/store";

const defaultOptions: ProcessingOptions = {
  squareSize: 80,
  gaussianKernel: [0.06242931069425457, 0.1247976249479739, 0.2524974040020353],
  hysteresisHigh: 0.075,
  hysteresisLow: 0.0275,
  minNeighborsForNoiseReduction: 6,
  houghVoteThreshold: 0.65,
  mergeThetaThreshold: 10,
  pixelThreshold: 0.35,
  maxLines: 6,
  noiseReductionIterations: 15,
  densityThreshold: 0.3080404237765713,
  densityStep: 2,
  densitySize: 16,
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
