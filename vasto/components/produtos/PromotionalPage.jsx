"use client";

import React from "react";
import Image from "@/components/loadings/LoadingImage";
import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";
import ProductTabela from "./ProductTabela";
import GalleryScroll from "@/components/galeria/GalleryScroll";
import ContactCard from "@/components/contacts/ContactCard";
import content from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "@/components/header/LanguageContext";

const simulatorLinks = {
  "racks-industriais": "/simulador/racks",
  "estante-carga-ligeira": "/simulador/estantes-ligeiras",
  "estantes-picking": "/simulador/pt/estantes-picking",
};

function PromotionalPage({ produto }) {
  const { language } = useLanguage();
  const english = language === "en";
  if (!produto) return <p className="px-5 py-24 text-center">Produto não encontrado</p>;

  const localizedProduct = english
    ? contenten.promotionalPages.find((p) => p.id === produto.id)
    : null;
  const isPickingProduct = produto.id === "estantes-picking";
  const displayProduct = localizedProduct || (english && isPickingProduct ? {
    ...produto,
    title: "Picking Shelving with Shelves",
    subtitle: "A modular solution for organising products and keeping stock within easy reach. Choose the dimensions and configure your shelving to suit the available space.",
    description: "<span class='label'>Material:</span> High-strength metal structure.<br/><span class='label'>Load capacity:</span> Up to 1,000 kg per beam pair.<br/><span class='label'>Frame height:</span> 2,000 to 5,500 mm.<br/><span class='label'>Frame depth:</span> 400 to 1,100 mm.<br/><span class='label'>Beam length:</span> 1,000 to 2,750 mm.<br/><span class='label'>Beam profiles:</span> Z60 or Z100.<br/><span class='label'>Description:</span> A robust metal shelving system for warehouses, workshops and storage areas. Its modular structure and quick-fit beams support a range of height, depth and length configurations to suit your load and organisation needs.",
  } : produto);
  const produtoCompleto = (english ? contenten : content).productsShowcase.products.find((p) => p.id === displayProduct.id);
  const tabelaFinal = displayProduct.tabela?.length ? displayProduct.tabela : produtoCompleto?.tabela || [];
  const simulatorHref = simulatorLinks[produto.id];
  const faqItems = english && isPickingProduct ? [
    { q: "Can I configure the shelving dimensions?", a: "Yes. In the simulator you can choose the length, height, depth and number of levels." },
    { q: "Which shelf types are available?", a: "You can choose chipboard or metal shelves, depending on the configuration." },
    { q: "Can I request a different configuration?", a: "Yes. Send us the details of your space and our team will help you find the right solution." },
  ] : displayProduct.faq;

  return (
    <main className="bg-[#f5f5f7] px-5 pb-16 pt-[80px] sm:px-8 sm:pt-24 lg:pb-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px]">
        <nav aria-label={english ? "Breadcrumb" : "Navegação estrutural"} className="mb-6 text-sm text-[#7a7a80]">
          <Link href="/produtos" className="transition-colors hover:text-(--orange)">{english ? "Products" : "Produtos"}</Link>
          <span className="mx-2 text-[#b5b5ba]" aria-hidden="true">/</span>
          <span className="text-[#4e4e53]">{displayProduct.title}</span>
        </nav>

        <section className="grid overflow-hidden rounded-[32px] border border-[#e5e5e7] bg-white lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative min-h-[300px] bg-white sm:min-h-[440px] lg:min-h-[620px]">
            <Image
              src={displayProduct.mainImage}
              alt={displayProduct.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-contain p-8 sm:p-12 lg:p-16"
            />
          </div>
          <div className="flex flex-col items-start justify-center bg-[#f5f5f7] p-7 sm:p-10 lg:p-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--orange)">{english ? "Storage solutions" : "Soluções de armazenagem"}</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.05em] text-[#1d1d1f] sm:text-5xl lg:text-6xl">
              {displayProduct.title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#6e6e73] sm:text-lg">
              {displayProduct.subtitle}
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              {simulatorHref && (
                <Link href={simulatorHref} className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-3 rounded-full bg-(--orange) px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-(--orange-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--orange)">
                  {english ? "Open simulator" : "Abrir simulador"} <FaArrowRight aria-hidden="true" />
                </Link>
              )}
              <Link href="/contacto" className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-3 rounded-full border border-[#d2d2d7] bg-white px-6 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#eceef2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1f]">
                {english ? "Request information" : "Pedir informações"}
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 py-14 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-14 lg:py-24">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--orange)">{english ? "Designed for your space" : "Pensado para o seu espaço"}</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#1d1d1f] sm:text-4xl">{english ? "A simple solution. Built to work." : "Uma solução simples. Feita para trabalhar."}</h2>
          </div>
          <div className="product-description text-base leading-7 text-[#55565c] sm:text-lg" dangerouslySetInnerHTML={{ __html: displayProduct.description || "" }} />
        </section>

        {displayProduct.features?.length > 0 && (
          <section className="grid gap-4 sm:grid-cols-2">
            {displayProduct.features.map((feature, index) => (
              <div key={`${feature.image}-${index}`} className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-[28px] border border-[#e5e5e7] bg-white p-8 sm:min-h-[340px]">
                <Image src={feature.image} alt={`${displayProduct.title} — ${english ? "detail" : "detalhe"} ${index + 1}`} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-contain p-7 sm:p-10" />
              </div>
            ))}
          </section>
        )}

        {displayProduct.gallery?.length > 0 && (
          <section className="py-14 sm:py-20 lg:py-24">
            <header className="mb-8 flex flex-col gap-3 border-b border-[#dedee3] pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--orange)">{english ? "In the field" : "No terreno"}</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1d1d1f] sm:text-4xl">{displayProduct.galleryTitle}</h2>
              </div>
              <span className="text-sm text-[#6e6e73]">{displayProduct.gallery.length} {english ? "photos" : "fotografias"}</span>
            </header>
            <GalleryScroll images={displayProduct.gallery} />
          </section>
        )}

        {tabelaFinal.length > 0 && (
          <section className="overflow-hidden rounded-[28px] border border-[#e5e5e7] bg-white py-7 sm:py-9">
            <header className="px-5 pb-5 sm:px-9">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--orange)">{english ? "Technical details" : "Detalhes técnicos"}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1d1d1f] sm:text-3xl">{english ? "Specifications" : "Especificações"}</h2>
            </header>
            <ProductTabela tabela={tabelaFinal} />
          </section>
        )}

        {faqItems?.length > 0 && (
          <section className="mx-auto max-w-4xl py-14 sm:py-20">
            <header className="mb-7 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--orange)">{english ? "Help" : "Ajuda"}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1d1d1f] sm:text-4xl">{english ? "Frequently asked questions" : "Perguntas frequentes"}</h2>
            </header>
            <div className="flex flex-col gap-3">
              {faqItems.map((item, index) => <FAQItem key={`${item.q}-${index}`} question={item.q} answer={item.a} />)}
            </div>
          </section>
        )}
      </div>
      <div className="mx-auto max-w-[1440px]">
        <ContactCard />
      </div>
    </main>
  );
}

function FAQItem({ question, answer }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-2xl border border-[#e5e5e7] bg-white px-5 py-4 sm:px-6">
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-4 text-left text-base font-semibold text-[#1d1d1f]" aria-expanded={open} onClick={() => setOpen(!open)}>
        {question}
        <span className="text-xl font-normal text-(--blue)" aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && <p className="mt-3 pr-8 text-sm leading-6 text-[#6e6e73] sm:text-base">{answer}</p>}
    </div>
  );
}

export default PromotionalPage;
