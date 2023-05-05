import { ProcessingOptions } from "@dto/ProcessingOptions";
import { createStore, SetStoreFunction } from "solid-js/store";

const defaultOptions: ProcessingOptions = {
  squareSize: 250,
  gaussianKernel: [0.06242931069425457, 0.1247976249479739, 0.2524974040020353],
  hysteresisHigh: 0.045,
  hysteresisLow: 0.005,
  minNeighborsForNoiseReduction: 6,
  houghVoteThreshold: 0.65,
  mergeThetaThreshold: 10,
  pixelThreshold: 0.35,
  maxLines: 6,
  noiseReductionIterations: 15,
  densityThreshold: 0.6,
  densityStep: 6,
  densitySize: 35,
  minimumFit: 0.2,
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
