import { sleep } from "src/lib/utils/finalImaging";
import { microscopeBridge } from ".";

export const grabImageOnFrameEnd = async (
  details: Parameters<(typeof microscopeBridge)["grabFullFrame"]>[0],
  options?: { minSleepMs?: number; pollIntervalMs?: number }
) => {
  await microscopeBridge.setFrozen(false);
  await sleep(250);
  await microscopeBridge.setFreezeOn("END_FRAME");
  await sleep(1000);
  await microscopeBridge.setFrozen(true);
  await sleep(options?.minSleepMs || 10000);
  while (true) {
    const isFrozen = await microscopeBridge.getFrozen();
    if (isFrozen) break;
    await sleep(options?.pollIntervalMs || 10000);
  }
  return microscopeBridge.grabFullFrame(details);
};
