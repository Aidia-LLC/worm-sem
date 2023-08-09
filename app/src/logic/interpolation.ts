import { Shape, ShapeSet } from "src/SliceManager/types";

export const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;

export const getInterpolationGroups = (ribbon: ShapeSet) => {
  const groups = new Map<Shape["id"], Set<number>>();
  let groupIndex = 0;
  for (let i = 0; i < ribbon.slices.length; i++) {
    const sliceGroups = groups.get(ribbon.slices[i].id) || new Set();

    if (!sliceGroups.has(groupIndex)) {
      sliceGroups.add(groupIndex);
      groups.set(ribbon.slices[i].id, sliceGroups);

      const configureSlice = ribbon.slicesToConfigure.includes(
        ribbon.slices[i].id
      );
      if (configureSlice && i !== 0) {
        i--;
      }
    } else {
      groupIndex++;
      if (i !== ribbon.slices.length - 1) {
        sliceGroups.add(groupIndex);
        groups.set(ribbon.slices[i].id, sliceGroups);
      }
    }
  }
  const maxGroup = groupIndex;
  // groups of size 2 have no meaning, so we can remove them
  for (let g = 0; g <= maxGroup; g++) {
    const groupSize = Array.from(groups.values()).filter((s) =>
      s.has(g)
    ).length;
    if (groupSize === 2) {
      groups.forEach((s) => {
        if (s.has(g)) s.delete(g);
        for (let i = g + 1; i <= maxGroup; i++) {
          if (s.has(i)) {
            s.delete(i);
            s.add(i - 1);
          }
        }
      });
      g--;
    }
  }
  return groups;
};
