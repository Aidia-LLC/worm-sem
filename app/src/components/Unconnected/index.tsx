import { Button } from "@components/Button";
import { microscopeBridge } from "@microscopeBridge/index";
import { createSignal } from "solid-js";

export const Unconnected = (props: { onConnect: () => void }) => {
  const [acknowledged, setAcknowledged] = createSignal(false);

  return (
    <>
      <label class="flex flex-row gap-2">
        <input
          type="checkbox"
          checked={acknowledged()}
          onChange={(e) => setAcknowledged(e.currentTarget.checked)}
        />
        <span>I have disabled the data zone!</span>
      </label>
      <div class="w-min">
        <Button
          onClick={async () => {
            await microscopeBridge.connect();
            props.onConnect();
          }}
          disabled={!acknowledged()}
          class="whitespace-nowrap"
        >
          Connect to microscope
        </Button>
      </div>
    </>
  );
};
