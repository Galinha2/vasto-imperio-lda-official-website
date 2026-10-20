"use client";
import { useState } from "react";
import { remainingLevels, editLevels } from "@/lib/editable-levels.mjs";
export default function useEditableLevels(initial) {
  const [state, setState] = useState({ slots: initial, removed: [] });
  const activeLevels = remainingLevels(state);
  return {
    levels: activeLevels.length, levelSlots: state.slots, activeLevels,
    setLevels: (count) => setState((current) => editLevels(current, { type: "set", count })),
    removeLevel: (index) => setState((current) => editLevels(current, { type: "remove", index })),
    restoreLevels: () => setState((current) => editLevels(current, { type: "restore" })),
  };
}
