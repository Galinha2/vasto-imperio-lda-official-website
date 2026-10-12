"use client";

import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import Link from "next/link";
import { useLanguage } from "../header/LanguageContext";

function SimulatorCard() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const { title, text: items } = content.simulationCards;

  return (
    <div className="pb-10">
      <div className="m-auto max-w-450 2xl:px-0">
        <h2 className="title pb-5 px-5 text-center m-auto">{title}</h2>
        <div className="flex items-center justify-center gap-5 px-5">
          {items.map((item, index) => (
            <div
              className="max-w-140 bg-(--gray) rounded-[30px] p-10"
              key={index}
            >
              <img
                src={item.image}
                alt={item.title}
                className="my-4 h-100 w-100 object-contain"
              />
              <h3 className="text-[1.5em] mb-2 font-semibold">{item.title}</h3>
              <ul className="list-disc pl-5">
                {item.subTitle?.map((line, lineIndex) => (
                  <li key={lineIndex}>{line.text}</li>
                ))}
              </ul>
              <Link href={item.url} className="mt-3 inline-block rounded-full bg-(--orange) px-8 py-1.5 text-white">
                {item.simulation}
              </Link>
            </div>
          ))}
        </div>
    </div>
    </div>
  );
}

export default SimulatorCard;
