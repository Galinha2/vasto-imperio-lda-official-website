import { notFound } from "next/navigation";
import SimulatorPicking from "@/components/simulador/SimulatorPicking";
import { createPageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return [{ lang: "pt", id: "estantes-picking" }, { lang: "en", id: "estantes-picking" }];
}

function validate({ lang, id }) {
  if (!["pt", "en"].includes(lang) || id !== "estantes-picking") notFound();
}

export async function generateMetadata({ params }) {
  validate(await params);
  // The simulator defaults to Portuguese; its language switch is client-side.
  return createPageMetadata({
    title: "Simulador de Estantes de Picking Metálicas",
    description: "Configure estantes de picking: dimensões, níveis e tampos metálicos ou em aglomerado. Simule o preço e peça apoio em Viseu, Benedita e Portugal.",
    path: "/simulador/pt/estantes-picking",
  });
}

export default async function SimulatorPage({ params }) {
  validate(await params);
  return <SimulatorPicking />;
}
