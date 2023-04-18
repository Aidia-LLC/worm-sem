import { SliceConfiguration } from "@dto/canvas";
import { Show } from "solid-js";
import { Button } from "./Button";

export const ConfigureSliceCanvas = (props: {
  totalSlices: number;
  configuration: SliceConfiguration;
  setConfiguration: (config: Partial<SliceConfiguration>) => void;
  onNext: () => void;
  onPrevious: () => void;
}) => {
  return (
    <div class="flex flex-col gap-2 items-center">
      <div class="flex flex-row gap-2 items-center justify-between">
        <div
          classList={{
            invisible: props.configuration.index === 0,
          }}
        >
          <Button onClick={props.onPrevious}>Previous Slice</Button>
        </div>
        <span>
          Configuring Slice {props.configuration.index + 1} of{" "}
          {props.totalSlices}
        </span>
        <Button onClick={props.onNext}>
          <Show
            when={props.configuration.index === props.totalSlices - 1}
            fallback="Next Slice"
          >
            Finish
          </Show>
        </Button>
      </div>
    </div>
  );
};
