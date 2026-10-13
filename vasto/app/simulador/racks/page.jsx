import SimulatorRacks from "@/components/simulador/SimulatorRacks";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Simulador de Racks Industriais",
  description: "Configure racks industriais e soluções de armazenagem para paletes. A Vasto Império apoia empresas em Viseu, Benedita e em todo o país.",
  path: "/simulador/racks",
});

export default function RacksSimulatorPage() {
  return <SimulatorRacks />;
}
