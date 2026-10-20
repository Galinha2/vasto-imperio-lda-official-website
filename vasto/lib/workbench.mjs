export const isWorkbenchFrame = (frame) => Number.isFinite(frame.height) && frame.height > 0 && frame.height <= 1000;

export function workbenchLevelPosition(index, levels, top, height, topInset) {
  if (levels === 1 || index === levels - 1) return top + topInset;
  return top + height * (levels === 3 && index === 0 ? 0.88 : 0.55);
}
