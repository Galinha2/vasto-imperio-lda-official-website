"use client";
import { useCallback, useState } from "react";
import { moduleLevels, removeModuleLevel } from "@/lib/editable-levels.mjs";
export default function useEditableLevels(initial) {
  const [state, setState] = useState({ slots: initial, modules: {} });
  const levelsForModule = useCallback((index) => moduleLevels(state, index), [state]);
  const restoreLevels = useCallback(() => setState((current) => Object.keys(current.modules).length ? { ...current, modules: {} } : current), []);
  return {
    levels: state.slots, levelSlots: state.slots,
    activeLevels: Array.from({ length: state.slots }, (_, index) => index),
    levelsForModule, hasRemovedLevels: Object.keys(state.modules).length > 0,
    removedKey: JSON.stringify(state.modules),
    setLevels: (count) => setState({ slots: Number(count), modules: {} }),
    removeLevel: (index, moduleIndex) => setState((current) => removeModuleLevel(current, moduleIndex, index)),
    restoreLevels,
  };
}
