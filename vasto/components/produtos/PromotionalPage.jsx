"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";
import ProductTabela from "../../components/produtos/ProductTabela";
import GalleryScroll from "../../components/galeria/GalleryScroll";
import ContactCard from "../../components/contacts/ContactCard";
import content from "../../assets/contentpt.json";

function PromotionalPage({ produto }) {
  if (!produto) return <p>Produto não encontrado</p>;

  // Buscar tabela a partir de productsShowcase pelo mesmo id
  const produtoCompleto = content.productsShowcase.products.find(
    (p) => p.id === produto.id
  );

  const tabelaFinal =
    produto.tabela && produto.tabela.length > 0
      ? produto.tabela
      : produtoCompleto?.tabela || [];

  return (
    <main className="py-12 px-5 md:px-10 flex flex-col justify-center w-screen">
      <div className="-mx-5 md:-mx-10 w-screen px-10 flex flex-col items-center justify-center">
        <div className="relative z-2 flex flex-col items-center justify-end h-190 gap-10 mb-10">
          <div className="absolute bottom-0 pb-5 lg:px-10 -m-10 bg-gradient-to-t from-white/90 to-transparent h-70 flex justify-end flex-col w-screen px-5 lg:max-w-450">
            <h1 className="text-4xl font-bold text-(--black) mb-6">
              {produto.title}
            </h1>
            <Link href="/orcamento" className="flex gap-4 items-center justify-center px-2 py-2 pl-5 h-15 rounded-full bg-gray-100/80 text-(--black) font-[600] w-fit">
              <p>Pedir Orçamento</p>
              <FaArrowRight className="bg-(--blue) cursor-pointer rounded-full p-2 h-10 w-10 text-white" />
            </Link>
          </div>

          <Image
            src={produto.mainImage}
            alt={produto.title}
            width={1000}
            height={300}
            className="rounded w-full max-w-100 md:w-150"
          />
        </div>

        <img
          className="z-1 mt-17 absolute w-screen h-146 md:h-[653px] lg:h-[723px] -top-0"
          src={produto.backgroundImage}
          alt="background"
          style={{ transform: "rotate(180deg)" }}
        />
      </div>

      <div className="bg-(--gray) -mx-5 lg:-mx-10 h-100 p-5 md:p-10 text-(--black) flex items-center justify-center">
          <p className="text-lg text-center font-bold max-w-200" dangerouslySetInnerHTML={{ __html: produto.subtitle }} />
      </div>

      <section className="my-35 m-auto flex flex-col items-center justify-center"> 
        <h2 className="text-4xl font-semibold mt-4 mb-10 lg:text-center lg:w-screen -mx-5 lg:-mx-10 px-10 max-w-450">Características Principais</h2>
        <div className="flex flex-col lg:flex-row lg:flex-wrap lg:-mx-10 lg:w-screen gap-10 items-center justify-center">
            <div className="bg-(--gray) p-5 md:p-10 rounded-[35px] flex items-center justify-center gap-5 md:gap-20 w-full max-w-150 md:max-w-200 lg:max-w-150">
              {produto.features.map((f, idx) => (
                <Image
                  key={idx}
                  src={f.image}
                  alt={produto.title}
                  width={1000}
                  height={500}
                  className="max-h-90 h-auto md:max-h-70 lg:max-h-70 w-auto rounded "
                />
              ))}
            </div>
            <div className="text-base mb-4 mt-10 lg:mt-0 lg:mb-0 max-w-120" dangerouslySetInnerHTML={{ __html: produto.description }} />
        </div>
      </section>

      <section className="mb-35">
        <h2 className="text-2xl font-semibold mb-4 max-w-450 m-auto lg:px-5">{produto.galleryTitle}</h2>
        <GalleryScroll images={produto.gallery} />
      </section>

      {tabelaFinal.length > 0 && (
        <section className="mb-10 mt-5 border-y -m-10 border-(--horizontal-line)">
          <h2 className="text-2xl font-semibold my-4 text-center">Especificações Técnicas</h2>
          <ProductTabela tabela={tabelaFinal} />
        </section>
      )}

      <section className="mb-35 px-6 py-8 bg-(--gray) rounded-[35px] shadow-lg lg:max-w-450 w-full m-auto">
        <h2 className="text-3xl font-bold mb-6 text-(--black) text-center">Perguntas Frequentes</h2>
        <div className="flex flex-col gap-4">
          {produto.faq.map((item, idx) => (
            <FAQItem key={idx} question={item.q} answer={item.a} />
          ))}
        </div>
      </section>

      <div className="-mx-5 md:-mx-10">
        <ContactCard />
      </div>
    </main>
  );
}

function FAQItem({ question, answer }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="bg-white rounded-xl p-4 shadow hover:shadow-md transition cursor-pointer">
      <h3
        className="font-semibold text-(--black) mb-2 flex justify-between items-center"
        onClick={() => setOpen(!open)}
      >
        {question}
        <span className="ml-2 text-(--blue)">{open ? "-" : "+"}</span>
      </h3>
      {open && <p>{answer}</p>}
    </div>
  );
}

export default PromotionalPage;