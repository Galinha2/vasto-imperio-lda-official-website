"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SpacePlanner from "./SpacePlanner";
import { simulatorPaths } from "./SpacePlannerButton";

export default function SpacePlannerPage({ models, type }) {
  const router = useRouter();
  const [activeType, setActiveType] = useState(type);
  return <SpacePlanner models={models} initialType={type} onTypeChange={setActiveType} onClose={() => router.push(simulatorPaths[activeType])} />;
}
