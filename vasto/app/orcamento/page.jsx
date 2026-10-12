import React from "react";
import OrcamentoInputs from "@/components/orcamento/OrcamentoInputs";
import ContactCard from "@/components/contacts/ContactCard";

export const metadata = {
  title: "Orçamento | Vasto Império LDA",
  description:
    "Receba um orçamento transparente para racks, prateleiras e soluções de arrumação, adaptado às necessidades do seu negócio local.",
};

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
