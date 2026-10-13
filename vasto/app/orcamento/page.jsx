import React from "react";
import OrcamentoInputs from "@/components/orcamento/OrcamentoInputs";
import ContactCard from "@/components/contacts/ContactCard";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Orçamento para Racks e Estantes",
  description: "Peça um orçamento gratuito para racks industriais, estantes metálicas, prateleiras e porta-paletes. Atendimento em Viseu, Benedita e em todo Portugal.",
  path: "/orcamento",
});

export default function Orcamento() {
  return (
    <main className="min-h-screen w-full overflow-hidden bg-[#f5f5f7]">
      <div>
        <OrcamentoInputs />
        <div className="border-t border-[#e5e5e7]">
          <ContactCard />
        </div>
      </div>
    </main>
  );
}
