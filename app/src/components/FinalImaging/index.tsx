import {
  handleFinalImaging,
  setupFinalConfigurations,
} from "@logic/finalImaging";
import { createSignal, onMount } from "solid-js";
import {
  initialStageSignal,
  magnificationSignal,
  nextRibbonIdSignal,
  primaryImageSignal,
  ribbonState,
  scanSpeedSignal,
} from "src/data/signals/globals";

export const FinalImaging = () => {
  const [percentComplete, setPercentComplete] = createSignal(0);
  const [ribbonReducer, ribbonDispatch] = ribbonState;
  const [initialStage] = initialStageSignal;
  const [nextRibbonId, setNextRibbonId] = nextRibbonIdSignal;
  const [magnification] = magnificationSignal;
  const [primaryImage] = primaryImageSignal;
  const [scanSpeed] = scanSpeedSignal;

  onMount(async () => {
    ribbonDispatch({ action: "clearFocusedSlice" });
    const ribbon = ribbonReducer().ribbons.find(
      (r) => r.id === ribbonReducer().focusedRibbonId
    );
    const stage = initialStage();
    if (!ribbon || !stage) return alert("Error grabbing ribbon");
    const ribbonId = nextRibbonId();
    setNextRibbonId(ribbonId + 1);
    const finalConfigurations = setupFinalConfigurations({
      canvasConfiguration: primaryImage()!.size!,
      ribbon,
      ribbonId,
      magnification: magnification(),
      stageConfiguration: stage,
    });
    console.log("final config", finalConfigurations);
    try {
      await handleFinalImaging({
        configurations: finalConfigurations,
        onProgressUpdate: setPercentComplete,
        scanSpeed: scanSpeed(),
      });
      alert(`Done imaging for ${ribbon.name}!`);
    } catch (err) {
      console.error(err);
      alert(`Error imaging ${ribbon.name}. ${(err as Error).message}`);
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
