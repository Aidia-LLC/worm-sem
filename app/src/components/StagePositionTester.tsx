import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { getSEMParam } from "src/data/semParams";
import { getNextCommandId } from "src/data/signals/commandQueue";

const UPDATE_INTERVAL = 1000;

export const StagePositionTester = () => {
  const [currentPosition, setCurrentPosition] = createSignal<
    [number, number] | null
  >(null);
  const [targetPosition, setTargetPosition] = createSignal<
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
    const x = parseFloat(await getSEMParam("AP_STAGE_AT_X"));
    const y = parseFloat(await getSEMParam("AP_STAGE_AT_Y"));
    setCurrentPosition([x, y]);
    if (targetPosition() === null) setTargetPosition([x, y]);
  };

  const updateXPosition = (x: number) => {
    setTargetPosition([x, targetPosition()?.[1] ?? 0]);
    window.semClient.send({
      id: getNextCommandId(),
      type: "setParam",
      param: "AP_STAGE_GOTO_X",
      doubleValue: x,
    });
  };

  const updateYPosition = (y: number) => {
    setTargetPosition([targetPosition()?.[0] ?? 0, y]);
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
        value={targetPosition()?.[0]}
        step={0.0001}
        onInput={(e) => updateXPosition(parseFloat(e.currentTarget.value))}
      />
      <input
        type="number"
        value={targetPosition()?.[1]}
        step={0.0001}
        onInput={(e) => updateYPosition(parseFloat(e.currentTarget.value))}
      />
      <Show when={currentPosition()} fallback="Getting position...">
        <span>
          {currentPosition()?.[0]}, {currentPosition()?.[1]}
        </span>
      </Show>
    </div>
  );
};
