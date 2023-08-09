import { handleFinalImaging } from "@logic/finalImaging";
import { createSignal, onMount } from "solid-js";
import { ribbonState, scanSpeedSignal } from "src/data/signals/globals";

export const FinalImaging = () => {
  const [percentComplete, setPercentComplete] = createSignal(0);
  const [ribbonReducer, ribbonDispatch] = ribbonState;
  const [scanSpeed] = scanSpeedSignal;

  onMount(async () => {
    const ribbons = ribbonReducer().enqueuedRibbons;
    console.log("final config", ribbons);
    try {
      await handleFinalImaging({
        configurations: ribbons,
        onProgressUpdate: setPercentComplete,
        scanSpeed: scanSpeed(),
      });
      alert("Done imaging!");
    } catch (err) {
      console.error(err);
      alert(`Error imaging. ${(err as Error).message}`);
    }
    ribbonDispatch({
      action: "setPhase",
      payload: "ribbon-detection",
    });
  });

  return (
    <div>
      <div>Imaging...</div>
      <div>{percentComplete()}% complete</div>
    </div>
  );
};
