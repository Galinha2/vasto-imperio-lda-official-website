"use client";

import Image from "@/components/loadings/LoadingImage";
import Link from "next/link";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";

export default function Cards() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const cards = content.homeCards.text;
  const promotionalPages = content.promotionalPages || [];
  const picking = content.productsShowcase?.products?.find((product) => product.id === "estantes-picking")
    || contentpt.productsShowcase?.products?.find((product) => product.id === "estantes-picking");
  const featuredProducts = [
    ...promotionalPages.slice(0, 2).map((promo) => ({
      id: promo.id,
      title: promo.title,
      image: promo.mainImage,
      href: `/${promo.id}`,
    })),
    ...(picking ? [{
      id: picking.id,
      title: picking.text,
      image: picking.image,
      href: "/estantes-picking",
    }] : []),
  ];

  return (
    <div>
      <section className="bg-[#f5f5f7] px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1480px] space-y-5">
          {cards.map((card, index) => (
            <article key={card.pageTitle} className="grid overflow-hidden rounded-[30px] border border-[#e5e5e7] bg-white lg:min-h-[390px] lg:grid-cols-2">
              <div className={`relative min-h-[240px] bg-white ${index % 2 ? "lg:order-2" : ""}`}>
                {card.image && <Image src={card.image} alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover object-top" />}
              </div>
              <div className="flex flex-col items-start justify-center p-7 sm:p-10 lg:p-14">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-(--orange)">{card.pageTitle}</p>
                <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.035em] text-[#1d1d1f] sm:text-4xl">{card.title}</h2>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-[#6e6e73]">{card.subTitle}</p>
                {card.url && <Link href={card.url} className="mt-7 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#f0f1f6] px-5 py-3 text-sm font-semibold text-[#1d1d1f] shadow-sm transition hover:bg-(--orange) hover:text-white">{card.button}<span aria-hidden="true">→</span></Link>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[#e5e5e7] bg-white px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--orange)">{language === "pt" ? "Soluções em destaque" : "Featured solutions"}</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[#1d1d1f] sm:text-4xl">{language === "pt" ? "Conheça os nossos produtos" : "Explore our products"}</h2>
            </div>
            <Link href="/produtos" className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-(--blue) hover:underline">{language === "pt" ? "Ver todos os produtos" : "View all products"}<span aria-hidden="true">→</span></Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featuredProducts.map((product) => (
              <Link href={product.href} key={product.id} className="group relative min-h-[360px] overflow-hidden rounded-[30px] bg-[#f5f5f7] p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,0.09)] sm:p-9">
                {product.image && <Image src={product.image} alt="" fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-contain p-12 transition duration-500 group-hover:scale-[1.04]" />}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#f5f5f7] via-[#f5f5f7]/95 to-transparent px-7 pb-7 pt-20 sm:px-9 sm:pb-9">
                  <h3 className="text-xl font-semibold tracking-tight text-[#1d1d1f]">{product.title}</h3>
                  <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-(--blue)">{language === "pt" ? "Descobrir" : "Discover"}<span aria-hidden="true">→</span></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
