"use client";

import Image from "@/components/loadings/LoadingImage";
import Link from "next/link";
import s from "./SimulatorCard.module.css";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";

export default function SimulatorCard() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const { title, text: items } = content.simulationCards;

  return (
    <div className={s.section}>
      <header className={s.header}>
        <div className={s.heading}><p className={s.eyebrow}>{title}</p>
        <h2>{language === "pt" ? "Configure à sua medida." : "Configure it your way."}<span>{language === "pt" ? "Veja o preço na hora." : "See the price instantly."}</span></h2>
        </div><div className={s.headerDetails}><p className={s.intro}>{language === "pt" ? "Escolha as medidas e explore a sua estante em 2D ou 3D, com estimativa imediata." : "Choose your dimensions and explore your shelving in 2D or 3D, with an instant estimate."}</p>
        <ul className={s.highlights} aria-label={language === "pt" ? "Vantagens do configurador" : "Configurator features"}>
          {(language === "pt" ? ["2D e 3D", "Estimativa imediata", "Sem compromisso"] : ["2D and 3D previews", "Instant estimate", "No-obligation request"]).map(text=><li key={text}><span aria-hidden="true">✓</span>{text}</li>)}
        </ul></div>
      </header>
      <div className={s.grid}>
        {items.map(item => <article key={item.title} className={s.card} data-surface-card>
          <Link href={item.url} className={s.image} aria-label={item.simulation}>
            <Image src={item.image} alt={item.title} fill sizes="(max-width: 700px) 90vw, 660px" className={s.productImage} />
          </Link>
          <div className={s.body}>
            <div><h3>{item.title}</h3><p className={s.description}>{item.url.includes("movimentacao")
              ? (language === "pt" ? "Stackers e porta-paletes manuais ou elétricos. Compare equipamentos e preços." : "Stackers and manual or electric pallet trucks. Compare equipment and prices.")
              : (language === "pt" ? "Racks, picking e ligeiras. Escolha as medidas e veja a estimativa da sua estante." : "Pallet racks, picking and light-duty shelving. Choose dimensions and see your estimate.")}</p></div>
            <Link href={item.url} className={s.action}>{item.simulation}<span aria-hidden="true">→</span></Link>
          </div>
        </article>)}
      </div>
    </div>
  );
}
