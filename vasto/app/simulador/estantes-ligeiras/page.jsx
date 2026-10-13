import SimulatorEstantesLigeiras from "@/components/simulador/SimulatorEstantesLigeiras";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Simulador de Estantes de Carga Ligeira",
  description: "Configure estantes metálicas para arrumação manual e cargas ligeiras. Simule a solução adequada com apoio da Vasto Império em Viseu, Benedita e Portugal.",
  path: "/simulador/estantes-ligeiras",
});

export default function LightShelvingSimulatorPage() {
  return <SimulatorEstantesLigeiras />;
}
