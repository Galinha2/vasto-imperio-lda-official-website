"use client";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext"; 
import Spinner from "../loadings/Spinner";
import Link from "next/link";

function Cards() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const item = content.homeCards.text;

  return (
    <div className="mb-0 pb-0">
      <div>
        {item.map((card, index) => (
          <div key={index} className="border-b pb-10 mb-5 border-(--horizontal-line)">
            <div className="p-5">
                <h1 className="font-bold text-(--orange) max-w-450 m-auto pb-5 text-[2em]">
                  {card.pageTitle}
                </h1>
                <div className={`m-auto flex ${index === 0 ? "lg:flex-row justify-end p-2 flex-col-reverse pb-10 lg:p-3" : "text-justify text-right gap-10 flex-col lg:flex-row-reverse justify-end pt-10 lg:pt-20"} max-w-450 bg-(--gray) items-center rounded-[35px] h-auto lg:gap-10 xl:gap-15 2xl:gap-70`}>
                  <div className={`p-5 flex flex-col ${index === 0 ? "items-start" : "items-end"}`}>
                    <h2 className="text-[2em] font-medium">{card.title}</h2>
                    <p className="my-2 max-w-110">{card.subTitle}</p>
                    {card.url && (
                      <Link
                        href={card.url}
                        className="bg-(--orange) text-center px-5 text-white py-2 min-w-35 shadow-md rounded-full"
                      >
                        {card.button}
                      </Link>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {card.image && <img className={`h-auto w-fit rounded-[35px] ${index === 0 ? "shadow-md w-full mb-10 md:mb-0 max-w-43 md:max-w-60 lg:max-w-60 xl:max-w-90 2xl:max-w-100" : "max-w-90 md:max-w-100 lg:max-w-120 xl:max-w-180 2xl:ml-10"}`} src={card.image} alt="" />}
                    {card.image && <img className={`h-auto w-fit rounded-[35px] ${index === 0 ? "shadow-md w-auto mb-10 md:mb-0 max-w-43 md:max-w-60 lg:max-w-60 xl:max-w-90 2xl:max-w-100" : "max-w-90 md:max-w-100 lg:max-w-120 xl:max-w-180 2xl:ml-10"}`} src={card.image2} alt="" />}
            </div>
                
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Cards;
