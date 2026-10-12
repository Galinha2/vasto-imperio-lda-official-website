"use client";

import { CiLocationOn, CiMail } from "react-icons/ci";
import { MdOutlineLocalPhone } from "react-icons/md";
import { LuStore } from "react-icons/lu";
import Link from "next/link";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";

const contactIcons = [CiLocationOn, MdOutlineLocalPhone, CiMail];

export default function ContactCard({ sectionBackground = "gray", wide = false }) {
  const { language } = useLanguage();
  const item = (language === "pt" ? contentpt : contenten).homeContacts;

  return (
    <section className={`${sectionBackground === "white" ? "bg-white" : "bg-[#f5f5f7]"} px-5 py-16 sm:px-8 sm:py-20 lg:py-24`}>
      <div className={`mx-auto ${wide ? "max-w-[1480px]" : "max-w-[1320px]"} rounded-[32px] border border-[#e5e5e7] bg-white px-6 py-10 text-[#1d1d1f] shadow-[0_8px_30px_rgba(0,0,0,0.05)] sm:px-10 sm:py-14 lg:px-14`}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--orange)">{language === "pt" ? "Estamos perto de si" : "Here for you"}</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">{item.title}</h2>
          <p className="mt-3 text-base text-[#6e6e73] sm:text-lg">{item.subTitle}</p>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-2">
          {item.text.map(({ location, phone, mail }, index) => {
            const values = [
              <span key="location">{location}</span>,
              <a key="phone" href={`tel:${phone.replace(/\s+/g, "")}`} className="transition-colors hover:text-(--orange)">{phone}</a>,
              <a key="mail" href={`mailto:${mail}`} className="break-all transition-colors hover:text-(--orange)">{mail}</a>,
            ];
            return (
              <article key={`${location}-${index}`} className="rounded-[24px] border border-[#e8e8eb] bg-[#f5f5f7] p-5 sm:p-6">
                <div className="flex items-center gap-3 border-b border-[#e1e1e5] pb-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-(--orange) shadow-sm"><LuStore className="text-2xl" aria-hidden="true" /></span>
                  <h3 className="text-lg font-semibold">{location}</h3>
                </div>
                <div className="mt-4 space-y-3">
                  {values.map((value, detailIndex) => {
                    const Icon = contactIcons[detailIndex];
                    return <div key={detailIndex} className="flex items-center gap-3 text-sm text-[#626268]"><Icon className="shrink-0 text-xl text-(--blue)" aria-hidden="true" />{value}</div>;
                  })}
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-[#e5e5e7] pt-7 sm:flex-row">
          <p className="text-center text-sm text-[#6e6e73] sm:text-left">{language === "pt" ? "Fale connosco e encontre a solução certa para o seu espaço." : "Get in touch and find the right solution for your space."}</p>
          <Link href={item.url} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-(--orange) px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-(--orange-hover)">{item.button}<span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </section>
  );
}
