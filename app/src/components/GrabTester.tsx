import { onMount } from "solid-js";
import { Button } from "./Button";

export const GrabTester = () => {
  let xRef!: HTMLInputElement;
  let yRef!: HTMLInputElement;
  let widthRef!: HTMLInputElement;
  let heightRef!: HTMLInputElement;
  let nameRef!: HTMLInputElement;
  let filenameRef!: HTMLInputElement;
  let reductionRef!: HTMLInputElement;

  onMount(async () => {
    const path = await window.getInitialPath();
    filenameRef.value = `${path}/grab.png`;
  });

  return (
    <div class="flex flex-col gap-3">
      <h3 class="font-bold text-xl">Grab Tester</h3>
      <input ref={xRef} type="number" placeholder="x" />
      <input ref={yRef} type="number" placeholder="y" />
      <input ref={widthRef} type="number" placeholder="width" />
      <input ref={heightRef} type="number" placeholder="height" />
      <input ref={nameRef} type="text" placeholder="name" />
      <input ref={filenameRef} type="text" placeholder="filename" />
      <input
        ref={reductionRef}
        type="number"
        placeholder="reduction (integer between -1 and 3)"
      />
      <Button
        onClick={() => {
          const x = parseInt(xRef.value);
          const y = parseInt(yRef.value);
          const width = parseInt(widthRef.value);
          const height = parseInt(heightRef.value);
          const name = nameRef.value;
          const filename = filenameRef.value;
          const reduction = parseInt(reductionRef.value);
          if (isNaN(x)) return alert("Invalid input for x");
          if (isNaN(y)) return alert("Invalid input for y");
          if (isNaN(width)) return alert("Invalid input for width");
          if (isNaN(height)) return alert("Invalid input for height");
          if (isNaN(reduction)) return alert("Invalid input for reduction");
          if (!name) return alert("Invalid input for name");
          if (!filename) return alert("Invalid input for filename");
          if (reduction < -1 || reduction > 3)
            return alert("Reduction must be between -1 and 3");
          if (x < 0 || y < 0 || width < 0 || height < 0)
            return alert("All values must be positive");
          window.semClient.send({
            id: Math.floor(Math.random() * 1000),
            type: "grab",
            x: parseInt(xRef.value),
            y: parseInt(yRef.value),
            width: parseInt(widthRef.value),
            height: parseInt(heightRef.value),
            name: nameRef.value,
            filename: filenameRef.value,
          });
        }}
      >
        Grab
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          const name = nameRef.value;
          const filename = filenameRef.value;
          const reduction = parseInt(reductionRef.value);
          if (!name) return alert("Invalid input for name");
          if (!filename) return alert("Invalid input for filename");
          if (reduction < -1 || reduction > 3)
            return alert("Reduction must be between -1 and 3");
          window.semClient.send({
            id: Math.floor(Math.random() * 1000),
            type: "grabFullFrame",
            name: nameRef.value,
            filename: filenameRef.value,
          });
        }}
      >
        Grab Full Frame
      </Button>
    </div>
  );
};
