import { createEffect } from "solid-js";

export const Canvas = () => {
  let canvasRef!: HTMLCanvasElement;

  createEffect(() => {
    
  })

  return (
    <div class="flex flex-col gap-3">
      <h3 class="font-bold text-xl mt-4 mx-4">Canvas</h3>
      <canvas ref={canvasRef} id="canvas" width="1000" height="1000"></canvas>
    </div>
  );
};
