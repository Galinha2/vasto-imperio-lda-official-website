
import React from "react";
import OrcamentoInputs from "@/components/orcamento/OrcamentoInputs";

export const metadata = {
  title: "Orçamento | Vasto Império LDA",
  description:
    "Receba um orçamento transparente para racks, prateleiras e soluções de arrumação, adaptado às necessidades do seu negócio local.",
};

export default function Orcamento() {
  return (
    <main className="p-5 pt-20 max-w-200 m-auto">
      <OrcamentoInputs />
    </main>
  );
}
