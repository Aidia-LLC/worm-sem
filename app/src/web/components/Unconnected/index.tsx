import { Button } from "@components/Button";
import { microscopeBridge } from "@MicroscopeBridge/index";
import { createSignal } from "solid-js";

export const Unconnected = (props: { onConnect: () => void }) => {
  const [datazoneCheck, setDatazoneCheck] = createSignal(false);
  const [rotationCheck, setRotationCheck] = createSignal(false);
  const acknowledged = () => datazoneCheck() && rotationCheck();

  return (
    <>
      <label class="flex flex-row gap-2">
        <input
          type="checkbox"
          checked={datazoneCheck()}
          onChange={(e) => setDatazoneCheck(e.currentTarget.checked)}
        />
        <span>I have disabled the data zone!</span>
      </label>
      <label class="flex flex-row gap-2">
        <input
          type="checkbox"
          checked={rotationCheck()}
          onChange={(e) => setRotationCheck(e.currentTarget.checked)}
        />
        <span>
          I have disabled the imaging rotation. SCANNING &rsaquo; ROTATE /
          TILT... &rsaquo; Uncheck "Scan Rot"
        </span>
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
