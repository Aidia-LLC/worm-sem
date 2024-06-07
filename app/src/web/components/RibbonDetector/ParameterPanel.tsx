import { optionsStore, scanSpeedSignal } from "@data/globals";
import { Param } from "./Param";

export const ParameterPanel = () => {
  const [scanSpeed, setScanSpeed] = scanSpeedSignal;
  const [options, setOptions] = optionsStore;

  return (
    <>
      <h3 class="font-bold text-xl mt-4 mb-2">Options</h3>
      <div class="grid grid-cols-2 gap-3 mb-12">
        <Param
          label="Final Scan Speed"
          value={scanSpeed()}
          onChange={setScanSpeed}
          description="This is the scan speed used for the final imaging. A value of 7 is a sensible default that will take about 20 minutes to image each slice."
          tooltipPosition="bottom"
        />
        <Param
          label="Box Size"
          value={options.options.boxSize}
          onChange={(e) => {
            setOptions((prev) => {
              return {
                ...prev,
                options: {
                  ...prev.options,
                  boxSize: e,
                },
              };
            });
          }}
          description="This is roughly the size of a slice, make sure the entire slice is contained within the box."
          tooltipPosition="bottom"
        />
      </div>
    </>
  );
};
