"use client";
import { IoIosClose } from "react-icons/io";
import { TbTruckDelivery } from "react-icons/tb";
import { FaMapMarkedAlt } from "react-icons/fa";
import { MdOutlineWorkspacePremium } from "react-icons/md";
import { FaRankingStar } from "react-icons/fa6";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";

const iconMap = {
  TbTruckDelivery: TbTruckDelivery,
  FaMapMarkedAlt: FaMapMarkedAlt,
  MdOutlineWorkspacePremium: MdOutlineWorkspacePremium,
  FaRankingStar: FaRankingStar,
}

function InfoIconsCards() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const item = content.homeInfoCards.text;
  const title = content.homeInfoCards.title;
  
  return (
      <div className="pt-7">
          <div className="flex flex-col m-auto px-5 gap-5">

              <div className="flex-wrap items-left justify-center flex flex-col gap-16">
              {item.map((card, index) => {
                const Icon = iconMap[card.icon];
                return (
                  <div
                    key={index}
                    className="bg-(--gray) flex items-center justify-left rounded-[35px] max-w-100 w-auto h-30 py-4 px-4 gap-4"
                  >
                    <div className="text-(--orange) bg-white shadow-md p-4 rounded-full text-[3em]">
                        <Icon />
                    </div>
                    <div>
                      <h1 className="text-[1.1em] text-black font-medium">{card.title}</h1>
                      <p className="text-(--text-gray)">{card.subTitle}</p>
                    </div>
                  </div>
                );
              })}
                  </div>
          </div>
      </div>
  );
}

export default InfoIconsCards;