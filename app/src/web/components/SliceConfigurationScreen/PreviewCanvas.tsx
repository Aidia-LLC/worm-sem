import { primaryImageSignal, ribbonState } from "@data/globals";
import { getSliceManager } from "@SliceManager/index";
import { Shape } from "@SliceManager/types";
import { setupCanvases } from "@utils/setupCanvases";
import { createEffect, onMount } from "solid-js";
import { groupColors } from "./groupColors";

export const PreviewCanvas = (props: {
  groups: Map<Shape["id"], Set<number>>;
}) => {
  const sliceManager = getSliceManager();

  const [ribbons] = ribbonState;
  const [primaryImage] = primaryImageSignal;

  let canvasRef!: HTMLCanvasElement;
  let overlayCanvasRef!: HTMLCanvasElement;

  onMount(async () => {
    const imageData = primaryImage();
    if (!imageData?.src) return;
    await setupCanvases({
      primaryCanvas: canvasRef,
      src: imageData.src,
      canvases: [overlayCanvasRef],
    });
    drawOverlay();
  });

  const drawOverlay = () => {
    const ribbon = ribbons().ribbons.find(
      (r) => r.id === ribbons().focusedRibbonId
    );
    if (!ribbon) return;
    const groups = props.groups;
    const ctx = overlayCanvasRef.getContext("2d")!;
    ctx.clearRect(0, 0, overlayCanvasRef.width, overlayCanvasRef.height);
    ribbon.slices.forEach((slice, i) => {
      const sliceGroups = [...(groups.get(slice.id) || new Set<number>())];
      sliceGroups.forEach((group, i, groups) => {
        const color = groupColors[group % groupColors.length];
        sliceManager.drawShape({
          shape: slice,
          color,
          ctx,
          thickness: 6 * (groups.length - i + 1),
        });
      });
      ctx.fillStyle = "white";
      ctx.font = `56px Arial`;
      ctx.fillText(`${i + 1}`, slice.left.x1, slice.left.y1);
    });
    ctx.lineWidth = 9;
    const radius = 3 * 4;
    for (let i = 0; i < ribbon.slices.length; i++) {
      const slice = ribbon.slices[i];
      const point = ribbon.matchedPoints[i];
      ctx.strokeStyle = ribbon.slicesToMove.includes(slice.id)
        ? "yellow"
        : "white";
      ctx.beginPath();
      ctx.arc(point[0], point[1], radius, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.stroke();
    }
  };

  createEffect(drawOverlay);

  return (
    <div class="relative">
      <canvas
        ref={canvasRef}
        id="canvas"
        width="1000"
        height="1000"
        class="w-[clamp(300px,_100%,_85vh)] mx-auto"
      ></canvas>
      <canvas
        ref={overlayCanvasRef}
        id="canvas"
        width="1000"
        height="1000"
        class="w-[clamp(300px,_100%,_85vh)] mx-auto absolute top-0 left-[50%] translate-x-[-50%] z-50"
      ></canvas>
    </div>
  );
};
