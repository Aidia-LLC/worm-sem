import { Button } from "@components/Button";
import { createSignal } from "solid-js";
import { microscopeApi } from "src/microscopeApi";

export const Unconnected = () => {
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
      <Button
        onClick={() => microscopeApi.connect()}
        disabled={!acknowledged()}
      >
        Connect
      </Button>
    </>
  );
};
