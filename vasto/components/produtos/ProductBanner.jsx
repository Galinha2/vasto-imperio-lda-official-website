"use client";
import Image from "next/image";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";

function ProductBanner() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const item = content.productBanner;
  return (
    <div className="relative flex w-full mt-17 h-70 md:h-100 xl:h-140 2xl:h-150 border-(--horizontal-line) border-b overflow-hidden">
      <Image
        src={item.background}
        alt="Banner Image"
        width={4000}
        height={500}
        priority
        className="z-1 absolute w-full md:h-full object-cover object-bottom-center object-bottom h-full"
      />
      <div className="w-full max-w-450 h-full m-auto flex flex-col items-center  px-5 justify-between">
        <div className="flex gap-3 flex-col-reverse items-center">
          <Image
            src={item.logo}
            alt="Banner Image"
            width={2000}
            height={50}
            priority
            className="z-2 absolute top-10 w-full max-w-[140px] md:max-w-[200px] lg:max-w-[220px] xl:max-w-[270px] h-auto"
          />
        </div>

        <Image
          src={item.tools}
          alt="Banner Image"
          width={2000}
          height={100}
          priority
          className="z-1 relative w-full lg:mt-3 max-w-[500px] md:max-w-[1000px] lg:max-w-[2000px] h-auto"
        />
      </div>
    </div>
  );
}

export default ProductBanner;
