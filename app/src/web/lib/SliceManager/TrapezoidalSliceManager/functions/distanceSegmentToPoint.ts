import { Vertex } from "../types";

export function distanceSegmentToPoint(
  A: Vertex,
  B: Vertex,
  C: Vertex
): number {
  // Compute vectors AC and AB
  const AC = sub(C, A);
  const AB = sub(B, A);

  // Get point D by taking the projection of AC onto AB then adding the offset of A
  const D = add(proj(AC, AB), A);

  const AD = sub(D, A);
  // D might not be on AB so calculate k of D down AB (aka solve AD = k * AB)
  // We can use either component, but choose larger value to reduce the chance of dividing by zero
  const k = Math.abs(AB.x) > Math.abs(AB.y) ? AD.x / AB.x : AD.y / AB.y;

  // Check if D is off either end of the line segment
  if (k <= 0.0) {
    return Math.sqrt(hypot2(C, A));
  } else if (k >= 1.0) {
    return Math.sqrt(hypot2(C, B));
  }

  return Math.sqrt(hypot2(C, D));
}

const add = (a: Vertex, b: Vertex) => ({
  x: a.x + b.x,
  y: a.y + b.y,
});
const sub = (a: Vertex, b: Vertex) => ({
  x: a.x - b.x,
  y: a.y - b.y,
});
const dot = (a: Vertex, b: Vertex) => a.x * b.x + a.y * b.y;
const hypot2 = (a: Vertex, b: Vertex) => dot(sub(a, b), sub(a, b));

// Function for projecting some vector a onto b
function proj(a: Vertex, b: Vertex) {
  const k = dot(a, b) / dot(b, b);
  return { x: k * b.x, y: k * b.y };
}
