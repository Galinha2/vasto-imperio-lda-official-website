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

export function moduleLevels(state, moduleIndex) {
  const removed = state.modules[moduleIndex] || [];
  return Array.from({ length: state.slots }, (_, index) => index).filter((index) => !removed.includes(index));
}
export function removeModuleLevel(state, moduleIndex, index) {
  if (!Number.isInteger(moduleIndex) || moduleIndex < 0 || !Number.isInteger(index)) return state;
  const active = moduleLevels(state, moduleIndex);
  if (active.length <= 1 || !active.includes(index)) return state;
  return { ...state, modules: { ...state.modules, [moduleIndex]: [...(state.modules[moduleIndex] || []), index] } };
}

export function levelDimensionGroups(modules, levelsForModule) {
  const groups = new Map();
  modules.forEach((_, index) => {
    const levels = levelsForModule(index);
    const key = levels.join(",");
    if (!groups.has(key)) groups.set(key, { levels, moduleIndexes: [] });
    groups.get(key).moduleIndexes.push(index);
  });
  return [...groups.values()];
}
