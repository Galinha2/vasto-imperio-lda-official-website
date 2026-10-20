export function remainingLevels(state) {
  return Array.from({ length: state.slots }, (_, index) => index).filter((index) => !state.removed.includes(index));
}
export function editLevels(state, action) {
  if (action.type === "set") return { slots: Number(action.count), removed: [] };
  if (action.type === "restore") return { ...state, removed: [] };
  if (action.type === "remove") {
    if (!Number.isInteger(action.index) || action.index < 0 || action.index >= state.slots || state.slots - state.removed.length <= 1 || state.removed.includes(action.index)) return state;
    return { ...state, removed: [...state.removed, action.index] };
  }
  return state;
}
export function levelClearance(index, nextIndex, spacing, thickness) {
  return Math.max(0, spacing * (nextIndex - index) - thickness);
}
