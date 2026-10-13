import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Simuladores de Estantes e Racks",
  description: "Configure estantes metálicas de carga ligeira, estantes de picking e racks industriais no simulador da Vasto Império. Apoio em Viseu e Benedita, com entregas em Portugal.",
  path: "/simulador",
});

export default function SimulatorLayout({ children }) {
  return children;
}
