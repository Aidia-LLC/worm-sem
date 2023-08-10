import { TrapezoidalSlice } from "../types";

export const drawTrapezoid = ({
  shape,
  ctx,
  color,
  thickness,
}: {
  shape: TrapezoidalSlice;
  ctx: CanvasRenderingContext2D;
  color: string;
  thickness: number;
}) => {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.moveTo(shape.top.x1, shape.top.y1);
  ctx.lineTo(shape.top.x2, shape.top.y2);
  ctx.lineTo(shape.bottom.x2, shape.bottom.y2);
  ctx.lineTo(shape.bottom.x1, shape.bottom.y1);
  ctx.lineTo(shape.top.x1, shape.top.y1);
  ctx.stroke();
  ctx.closePath();
};
