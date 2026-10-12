"use client";

import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";
import Image from "next/image";
import Link from "next/link";

export default function Products() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const products = content.productsShowcase.products;
  const bentoSizes = [
    "lg:col-span-2 lg:row-span-2",
    "lg:row-span-3",
    "lg:row-span-2",
    "lg:row-span-1",
    "lg:col-span-2 lg:row-span-2",
    "lg:row-span-2",
    "lg:row-span-3",
    "lg:row-span-2",
    "lg:col-span-2 lg:row-span-2",
    "lg:row-span-2",
    "lg:row-span-1",
    "lg:row-span-2",
    "lg:col-span-2 lg:row-span-2",
    "lg:row-span-1",
  ];

  return (
    <section className="bg-[#f5f5f7] px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-10 flex flex-col gap-5 border-b border-[#e5e5e7] pb-8 sm:mb-12 sm:flex-row sm:items-end sm:justify-between sm:pb-9">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--orange)">
              {language === "pt" ? "Catálogo de produtos" : "Product catalogue"}
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#1d1d1f] sm:text-4xl">
              {language === "pt" ? "Encontre a solução ideal" : "Find the right solution"}
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-[#6e6e73] sm:text-right sm:text-base">
            {language === "pt"
              ? "Sistemas de armazenagem e equipamentos selecionados para responder às necessidades do seu negócio."
              : "Storage systems and equipment selected to meet your business needs."}
          </p>
        </header>

        <div className="flex flex-col gap-12 sm:grid sm:grid-cols-2 sm:gap-10 lg:auto-rows-[220px] lg:grid-flow-dense lg:grid-cols-4 lg:gap-6">
          {products.map((product, index) => (
            <Link
              key={product.id}
              href={`/produtos/${language}/${product.id}`}
              className={`group relative isolate col-span-1 row-span-1 flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-[28px] border border-[#e5e5e7] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.025)] transition duration-300 hover:-translate-y-1 hover:border-[#d7d8de] hover:shadow-[0_18px_40px_rgba(0,0,0,0.09)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--orange) lg:min-h-0 ${bentoSizes[index % bentoSizes.length]}`}
            >
              <div className="relative min-h-0 flex-1">
                <Image
                  src={product.image}
                  alt={product.text}
                  fill
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 50vw"
                  className="object-contain object-bottom p-6 transition duration-500 group-hover:scale-[1.045] sm:p-7"
                />
              </div>
              <div className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-t border-[#f0f0f2] bg-white px-5 py-5 sm:px-6">
                <h3 className={`font-semibold leading-snug tracking-[-0.03em] text-[#1d1d1f] ${[0, 4, 8, 12].includes(index) ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"}`}>
                  {product.text}
                </h3>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-lg text-[#1d1d1f] transition duration-300 group-hover:bg-(--orange) group-hover:text-white" aria-hidden="true">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
