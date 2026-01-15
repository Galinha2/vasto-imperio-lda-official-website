"use client"; // torna este componente um Client Component
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sucesso from "@/components/sucesso/Sucesso";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    const enviado = sessionStorage.getItem("orcamentoEnviado");
    if (!enviado) {
      // redireciona para o formulário se não houver envio
      router.replace("/orcamento");
    } else {
      // remove a flag para impedir re-acesso
      sessionStorage.removeItem("orcamentoEnviado");
    }
  }, [router]);

  return <Sucesso />;
}
