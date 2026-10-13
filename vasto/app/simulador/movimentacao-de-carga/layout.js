import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Simulador de Porta-Paletes e Equipamentos de Carga",
  description: "Explore equipamentos de movimentação de carga da Vasto Império, incluindo porta-paletes manuais e elétricos. Apoio em Viseu e Benedita, com entrega em Portugal.",
  path: "/simulador/movimentacao-de-carga",
});

export default function HandlingSimulatorLayout({ children }) {
  return children;
}
