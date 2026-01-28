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
    <main className="relative z-0 pt-30 md:pt-20 w-full min-h-full mt-17 overflow-hidden">
      
      {/* Background rodado 180° */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: "url('/background.png')",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "bottom",
          transform: "rotate(180deg)",
        }}
      />

      {/* Conteúdo normal */}
      <OrcamentoInputs />
      <div className="border-t border-(--horizontal-line) mt-15 pt-15">
        <ContactCard />
      </div>
    </main>
  );
}