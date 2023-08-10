import {
  optionsSequenceSignal,
  optionsStore,
  scanSpeedSignal,
} from "src/lib/data/signals/globals";
import { Button } from "../Button";
import { Param } from "./Param";

export const ParameterPanel = () => {
  const [options, setOptions, resetOptions] = optionsStore;
  const [optionsSequence, setOptionsSequence] = optionsSequenceSignal;
  const [scanSpeed, setScanSpeed] = scanSpeedSignal;

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
          label="Final Scan Speed"
          value={scanSpeed()}
          onChange={setScanSpeed}
          description="This is the scan speed used for the final imaging. A value of 7 is a sensible default that will take about 20 minutes to image each slice."
          tooltipPosition="bottom"
        />
        <Param
          description="This sets how strictly the algorithm will consider a possible line to be a line. Too high, it may not find enough lines to find a trapezoid. Too low, it may get confused with all the lines. If the mask is really good, try lowering to 0.4. If the mask is not good, bump up to 0.6."
          label="Hough Vote Threshold"
          value={options.options.houghVoteThreshold}
          onChange={(value) => {
            setOptions("options", "houghVoteThreshold", value);
            setOptionsSequence(optionsSequence() + 1);
          }}
        />
        <Param
          description="When looking for a trapezoid, the algorithm looks at the top X lines found in the 'bounding box'. This sets X. Recommended to be at least 4, but for worse masks, may need to be as higher"
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
      </div>
    </>
  );
};
