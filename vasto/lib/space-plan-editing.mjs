export const topViewIsVertical = (shelf) => Number.isFinite(shelf.runWidth) ? Math.abs(shelf.w - shelf.runWidth) > 0.001 : shelf.h > shelf.w;

export function shelfKey(shelf) {
  return [shelf.x, shelf.y, shelf.w, shelf.h, shelf.wall || ""].join(":");
}

export function editSpacePlan(plan, removed = [], excludedWalls = []) {
  const hidden = new Set(removed);
  const excluded = new Set(excludedWalls);
  const shelves = plan.shelves.filter((shelf) => !hidden.has(shelfKey(shelf)) && !excluded.has(shelf.wall));
  return {
    ...plan,
    shelves,
    estimate: undefined,
    runLength: shelves.reduce((sum, shelf) => sum + (shelf.runWidth || Math.max(shelf.w, shelf.h)), 0),
    area: shelves.reduce((sum, shelf) => sum + shelf.w * shelf.h, 0),
    centralCount: shelves.filter((shelf) => shelf.central).length,
  };
}

export function sharesStartFrame(shelf, shelves) {
  const vertical = topViewIsVertical;
  const close = (a, b) => Math.abs(a - b) < 0.0001;
  const isVertical = vertical(shelf);
  return shelves.some((other) => other !== shelf && vertical(other) === isVertical && close(other.height, shelf.height) && (isVertical
    ? close(other.x, shelf.x) && close(other.w, shelf.w) && close(other.y + other.h, shelf.y)
    : close(other.y, shelf.y) && close(other.h, shelf.h) && close(other.x + other.w, shelf.x)));
}
