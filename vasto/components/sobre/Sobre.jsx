"use client";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";
import Image from "next/image";
import { FaAward } from "react-icons/fa";

function Sobre() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const item = content.sobreNos;
  const logo = content.header.logo;

  return (
    <div className="text-medium border-bm-auto w-screen border-(--horizontal-line) mb-20">
      <h1 className="bg-(--gray) p-5 text-center title font-black text-[1.8em] md:text-[2.5em]">{item.title}</h1>
      <div className="flex py-15 flex-col gap-5 m-auto">
        <div className="flex flex-col md:flex-row max-w-200 m-auto">
            <div className="max-w-200 m-auto px-5">
              <p className="text-(--orange) font-black text-[1.2em]">{item.p1t}</p>
              <p>{item.p1}</p>
              <br />
              <p className="text-(--blue) font-black text-[1.2em]">{item.p2t}</p>
              <p>{item.p2}</p>
            </div>
            <Image
              src={logo}
              alt="Factory Image"
              width={2000}
              height={400}
              className="my-5 mx-auto drop-shadow-[0_8px_8px_rgba(0,0,0,0.35)] w-full max-w-110"
            />
        </div>
        <div className="flex gap-5 text-center items-center justify-center text-[5em] md:text-[6em] lg:text-[7em] xl:text-[8em] 2xl:text-[9em] font-black bg-(--gray)">
          
          <p className=" drop-shadow-[0_8px_8px_rgba(0,0,0,0.35)] text-(--orange)">
            {item.vinte}
          </p>

          <p className=" drop-shadow-[0_8px_8px_rgba(0,0,0,0.35)] text-(--blue)">
            {item.anos}
          </p>
          {/* <div className="flex">
                    <p className=" drop-shadow-[0_8px_8px_rgba(0,0,0,0.35)] text-(--orange)">{item.vinte}</p>
                    <FaAward className="mt-7 text-(--orange) text-[1.15em] -ml-3 drop-shadow-[0_8px_8px_rgba(0,0,0,0.35)]" />
                </div>
                <p className=" drop-shadow-[0_8px_8px_rgba(0,0,0,0.35)] text-(--blue)">{item.anos}</p> */}
        </div>
        <div className="max-w-200 py-10 m-auto px-5">
          <p className="text-(--orange) font-black text-[1.2em]">{item.p3t}</p>
          <p>{item.p3}</p>
          <br />
          <p className="text-(--blue) font-black text-[1.2em]">{item.p4t}</p>
          <p>{item.p4}</p>
        </div>
      </div>
    </div>
  );
}

export default Sobre;
