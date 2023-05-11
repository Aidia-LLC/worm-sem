import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { getSEMParam } from "src/data/semParams";
import { getNextCommandId } from "src/data/signals/commandQueue";

const UPDATE_INTERVAL = 1000;

export const StagePositionTester = () => {
  const [currentPosition, setCurrentPosition] = createSignal<
    [number, number] | null
  >(null);

  let timer: any;

  onMount(async () => {
    timer = setInterval(fetchPosition, UPDATE_INTERVAL);
  });

  onCleanup(() => {
    clearInterval(timer);
  });

  const fetchPosition = async () => {
    const x = parseInt(await getSEMParam("AP_STAGE_AT_X"));
    const y = parseInt(await getSEMParam("AP_STAGE_AT_Y"));
    setCurrentPosition([x, y]);
  };

  const updateXPosition = (x: number) => {
    window.semClient.send({
      id: getNextCommandId(),
      type: "setParam",
      param: "AP_STAGE_GOTO_X",
      doubleValue: x,
    });
  };

  const updateYPosition = (y: number) => {
    window.semClient.send({
      id: getNextCommandId(),
      type: "setParam",
      param: "AP_STAGE_GOTO_Y",
      doubleValue: y,
    });
  };

  return (
    <div>
      <input
        type="number"
        value={currentPosition()?.[0]}
        onInput={(e) => updateXPosition(parseInt(e.currentTarget.value))}
      />
      <input
        type="number"
        value={currentPosition()?.[1]}
        onInput={(e) => updateYPosition(parseInt(e.currentTarget.value))}
      />
      <Show when={currentPosition()} fallback="Getting position...">
        <span>
          {currentPosition()?.[0]}, {currentPosition()?.[1]}
        </span>
      </Show>
    </div>
  );
};
