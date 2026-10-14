export const isWorkbenchFrame = (frame) => Number.isFinite(frame.height) && frame.height > 0 && frame.height <= 1000;

export function workbenchLevelPosition(index, levels, top, height, topInset) {
  return levels === 1 || index === levels - 1 ? top + topInset : top + height * 0.55;
}
