import { sleep } from "@logic/handleFinalImaging";
import { microscopeApi } from ".";

export const grabImageOnFrameEnd = async (
  details: Parameters<(typeof microscopeApi)["grabFullFrame"]>[0],
  options?: { minSleepMs?: number; pollIntervalMs?: number }
) => {
  await microscopeApi.setFrozen(false);
  await sleep(250);
  await microscopeApi.setFreezeOn("END_FRAME");
  await sleep(1000);
  await microscopeApi.setFrozen(true);
  await sleep(options?.minSleepMs || 10000);
  while (true) {
    const isFrozen = await microscopeApi.getFrozen();
    if (isFrozen) break;
    await sleep(options?.pollIntervalMs || 10000);
  }
  return microscopeApi.grabFullFrame(details);
};
