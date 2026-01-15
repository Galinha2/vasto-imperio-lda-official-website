"use client";
import { FaAward } from "react-icons/fa6";
import Link from "next/link";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext"; 

function Sucesso() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const item = content.orcamento;

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-3">
      <FaAward className="text-[8em] rounded-full bg-white shadow-md p-2 text-(--orange)" />
      <h1 className="title text-(--blue)">{item.success}</h1>
      <Link
        href="/"
        className="bg-(--orange) text-center px-5 text-white py-2 min-w-35 shadow-md rounded-full mt-5"
      >
        {item.return}
      </Link>
    </div>
  );
}

export default Sucesso;