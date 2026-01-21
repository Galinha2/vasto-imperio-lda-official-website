"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sucesso from "@/components/sucesso/Sucesso";

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const enviado = searchParams.get("enviado");

  useEffect(() => {
    if (enviado !== "true") {
      router.replace("/orcamento");
    }
  }, [enviado, router]);

  return <Sucesso />;
}