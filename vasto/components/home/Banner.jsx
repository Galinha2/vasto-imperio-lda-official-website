"use client";

import Image from "next/image";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";

function Banner() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const item = content.homeHeader.text[0];
  return (
    <div className="relative flex w-full mt-17 h-150 md:h-120 lg:h-150 border-(--horizontal-line) border-b overflow-hidden">
      <Image
        src={content.homeHeader.background}
        alt="Banner Image"
        fill
        priority
        className="z-1 absolute object-cover object-bottom-left object-bottom rotate-180 md:rotate-0"
      />
      <div className="w-full max-w-450 h-full m-auto flex flex-col md:flex-row items-center md:items-end px-5 justify-between">
        <div className="flex gap-3 flex-col-reverse items-center md:items-start md:flex-col">
              <Image
                src={content.header.logo}
                alt="Banner Image"
                width={2000}
                height={50}
                priority
                className="z-1 relative w-full max-w-[100px] md:max-w-[250px] lg:max-w-[350px] xl:max-w-[400px] h-auto"
              />
            <div className="flex flex-col md:items-start text-center md:text-left items-center gap-4 justify-end z-1 relative bg-[var(--gray-transparent)] backdrop-blur-[5px] w-110 h-57 md:h-58 pt-5 px-5 pb-6 md:pb-4 rounded-[0px_0px_35px_35px] md:rounded-[35px_35px_0px_0px]">
              <h1
                className="text-3xl md:text-4xl font-black text-[var(--blue)]"
                dangerouslySetInnerHTML={{ __html: item.title }}
              ></h1>
              <p className="text-[var(--blue)] w-90">{item.subTitle}</p>
              <a
                key={item.url}
                href={item.url}
                className="bg-[var(--orange)] hover:bg-[var(--orange-hover)] text-white px-4 py-2 rounded-full shadow-md"
              >
                {item.button}
              </a>
            </div>
        </div>

        <Image
          src={content.homeHeader.tools}
          alt="Banner Image"
          width={2000}
          height={100}
          priority
          className="z-1 relative w-full max-w-[400px] md:max-w-[300px] lg:max-w-[500px] xl:max-w-[800px] h-auto"
        />
      </div>
    </div>
  );
}

export default Banner;