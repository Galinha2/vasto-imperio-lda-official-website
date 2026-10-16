import { notFound } from "next/navigation";
import SpacePlannerPage from "@/components/simulador/SpacePlannerPage";
import budget from "@/assets/orcamento.json";
import { spaceCatalog } from "@/lib/space-catalog.mjs";

export const metadata = { title: "Planear espaço · Administração", robots: { index: false, follow: false } };

export default async function Page({ params }) {
  const { type } = await params;
  if (!["ligeiras", "picking", "racks"].includes(type)) notFound();
  return <SpacePlannerPage type={type} models={spaceCatalog(budget.produtos)} />;
}
