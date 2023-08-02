import { createSignal, Show } from "solid-js";
import {
  optionsSequenceSignal,
  optionsStore,
  scanSpeedSignal,
} from "src/data/signals/options";
import { Button } from "./Button";
import { Param } from "./Param";

export const ParameterPanel = () => {
  const [options, setOptions, resetOptions] = optionsStore;
  const [optionsSequence, setOptionsSequence] = optionsSequenceSignal;
  const [scanSpeed, setScanSpeed] = scanSpeedSignal;
  const [paramsHidden, setParamsHidden] = createSignal(true);

  return (
    <>
      <h3 class="font-bold text-xl mt-4">Options</h3>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-3">
          <p>For fine tuning of all other parameters:</p>
          <Button onClick={() => setParamsHidden(!paramsHidden())}>
            {paramsHidden() ? "Show" : "Hide"} Additional Parameters
          </Button>
        </div>
        <div class="flex-col">
          <p>
            This sets the size of a 'bounding box' where the algorithm will look
            for a trapezoid. This may need to be changed if the image is more or
            less zoomed in than usual.
          </p>
          <Param
            label="Square Size"
            value={options.options.squareSize}
            onChange={(value) => {
              setOptions("options", "squareSize", value);
              setOptionsSequence(optionsSequence() + 1);
            }}
          />
        </div>
        <div class="flex-col">
          <Param
            label="Scan Speed (final imaging)"
            value={scanSpeed()}
            onChange={(value) => {
              setScanSpeed(value);
            }}
          />
        </div>
        <div class="flex=col">
          <p>
            This sets the minimum fit relative to the first fit for a trapezoid
            to be valid. If this is too high, the algorithm will fail to find a
            trapezoid where there are few edge pixels. Too low, and trapezoids
            will be found past the line of trapezoids.
          </p>
          <Param
            label="Minimum Fit for Recurrence"
            value={options.options.minimumFit}
            onChange={(value) => {
              setOptions("options", "minimumFit", value);
              setOptionsSequence(optionsSequence() + 1);
            }}
          />
        </div>
        <div class="flex-col">
          <p>
            This sets the minimum fit for the first trapezoid, if this fails a
            secondary algorithm will be used to find a trapezoid. This may not
            need to be changed.
          </p>
          <Param
            label="Minimum Fit for First"
            value={options.options.firstFit}
            onChange={(value) => {
              setOptions("options", "firstFit", value);
              setOptionsSequence(optionsSequence() + 1);
            }}
          />
        </div>
        <Show when={!paramsHidden()}>
          <div class="flex-col">
            <p>
              This sets how strictly the algorithm will consider a possible line
              to be a line. Too high, it may not find enough lines to find a
              trapezoid. Too low, it may get confused with all the lines.
            </p>
            <Param
              label="Hough Vote Threshold"
              value={options.options.houghVoteThreshold}
              onChange={(value) => {
                setOptions("options", "houghVoteThreshold", value);
                setOptionsSequence(optionsSequence() + 1);
              }}
            />
          </div>
          <div class="flex-col">
            <p>
              This merges all lines that are within this distance of each other.
            </p>
            <Param
              label="Merge Line Threshold"
              value={options.options.mergeLineThreshold}
              onChange={(value) => {
                setOptions("options", "mergeLineThreshold", value);
                setOptionsSequence(optionsSequence() + 1);
              }}
            />
          </div>
          <div class="flex-col">
            <p>
              Lines that cross less than this number of edge pixels are
              discarded.
            </p>
            <Param
              label="Pixels Per Line Percentage Threshold"
              value={options.options.pixelThreshold}
              onChange={(value) => {
                setOptions("options", "pixelThreshold", value);
                setOptionsSequence(optionsSequence() + 1);
              }}
            />
          </div>
          <div class="flex-col">
            <p>
              When looking for a trapezoid, the algorithm looks at the top X
              lines found in the 'bounding box'. This sets X.
            </p>
            <Param
              label="Max Lines Per Square"
              value={options.options.maxLines}
              onChange={(value) => {
                setOptions("options", "maxLines", value);
                setOptionsSequence(optionsSequence() + 1);
              }}
            />
          </div>
          <Button onClick={resetOptions}>Reset Parameters</Button>
        </Show>
      </div>
    </>
  );
};
