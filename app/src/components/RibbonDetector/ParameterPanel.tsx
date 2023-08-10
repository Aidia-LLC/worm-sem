import { createSignal, Show } from "solid-js";
import {
  optionsSequenceSignal,
  optionsStore,
  scanSpeedSignal,
} from "src/data/signals/globals";
import { Button } from "../Button";
import { Param } from "./Param";

export const ParameterPanel = () => {
  const [options, setOptions, resetOptions] = optionsStore;
  const [optionsSequence, setOptionsSequence] = optionsSequenceSignal;
  const [scanSpeed, setScanSpeed] = scanSpeedSignal;
  const [paramsHidden, setParamsHidden] = createSignal(true);

  return (
    <>
      <h3 class="font-bold text-xl mt-4 mb-2">Options</h3>
      <div class="grid grid-cols-2 gap-3 mb-12">
        <Param
          label="Slice Bounding Box Size"
          value={options.options.squareSize}
          onChange={(value) => {
            setOptions("options", "squareSize", value);
            setOptionsSequence(optionsSequence() + 1);
          }}
          tooltipPosition="right"
          description="This sets the size of a bounding box where the program will look for a slice. This may need to be changed if the apparent size of the slices is larger or smaller than usual."
        />
        <Param
          label="Scan Speed"
          value={scanSpeed()}
          onChange={setScanSpeed}
          description="This is the scan speed used for the final imaging. A value of 7 is a sensible default that will take about 20 minutes to image each slice."
          tooltipPosition="bottom"
        />
        <div class="flex flex-col gap-3 col-span-2">
          <div class="w-min self-start">
            <Button
              variant="primary-outline"
              onClick={() => setParamsHidden(!paramsHidden())}
              tooltip="Allows fine tuning of other parameters that are less likely to need to be changed."
              tooltipPosition="bottom"
              class="w-min whitespace-nowrap"
            >
              {paramsHidden() ? "Show" : "Hide"} Additional Parameters
            </Button>
          </div>
        </div>
        <Show when={!paramsHidden()}>
          <Param
            description="This sets the minimum fit for the first trapezoid, if this fails a secondary algorithm will be used to find a trapezoid. This may not need to be changed."
            label="Minimum Fit for First"
            value={options.options.firstFit}
            onChange={(value) => {
              setOptions("options", "firstFit", value);
              setOptionsSequence(optionsSequence() + 1);
            }}
            tooltipPosition="bottom"
          />
          <Param
            label="Minimum Fit for Recurrence"
            description="This sets the minimum fit relative to the first fit for a trapezoid to be valid. If this is too high, the algorithm will fail to find a trapezoid where there are few edge pixels. Too low, and trapezoids will be found past the line of trapezoids."
            value={options.options.minimumFit}
            onChange={(value) => {
              setOptions("options", "minimumFit", value);
              setOptionsSequence(optionsSequence() + 1);
            }}
            tooltipPosition="right"
          />
          <Param
            description="This sets how strictly the algorithm will consider a possible line to be a line. Too high, it may not find enough lines to find a trapezoid. Too low, it may get confused with all the lines."
            label="Hough Vote Threshold"
            value={options.options.houghVoteThreshold}
            onChange={(value) => {
              setOptions("options", "houghVoteThreshold", value);
              setOptionsSequence(optionsSequence() + 1);
            }}
          />
          <Param
            description="This merges all lines that are within this distance of each other. Recommended around 1/4 of the square size."
            label="Merge Line Threshold"
            value={options.options.mergeLineThreshold}
            onChange={(value) => {
              setOptions("options", "mergeLineThreshold", value);
              setOptionsSequence(optionsSequence() + 1);
            }}
            tooltipPosition="right"
          />
          <Param
            description="When looking for a trapezoid, the algorithm looks at the top X lines found in the 'bounding box'. This sets X."
            label="Max Lines Per Square"
            value={options.options.maxLines}
            onChange={(value) => {
              setOptions("options", "maxLines", value);
              setOptionsSequence(optionsSequence() + 1);
            }}
            tooltipPosition="right"
          />
          <div>
            <Button variant="danger-outline" onClick={resetOptions}>
              Reset Parameters
            </Button>
          </div>
        </Show>
      </div>
    </>
  );
};
