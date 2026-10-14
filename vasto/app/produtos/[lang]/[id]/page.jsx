import { notFound } from "next/navigation";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import GalleryClient from "./GalleryClient";
import ContactCard from "@/components/contacts/ContactCard";
import ProductTabela from "@/components/produtos/ProductTabela";
import Galeria from "@/components/galeria/Galeria";
import Link from "next/link";
import SimulatorSectionTabs from "@/components/simulador/SimulatorSectionTabs";
import budget from "@/assets/orcamento.json";

const portugueseProductSeo = {
  "racks-industriais": {
    title: "Racks Industriais para Paletes",
    description: "Racks industriais para armazenagem de paletes e cargas pesadas. Projeto e fornecimento com apoio da Vasto Império em Viseu e Benedita e entregas em Portugal.",
  },
  "estante-carga-ligeira": {
    title: "Estantes Metálicas de Carga Ligeira",
    description: "Estantes metálicas para arrumação manual e cargas ligeiras, adaptáveis a oficinas, lojas e armazéns. Peça aconselhamento e orçamento à Vasto Império.",
  },
  "estantes-picking": {
    title: "Estantes de Picking",
    description: "Estantes de picking para preparação de encomendas e armazenagem manual em armazéns. Soluções da Vasto Império para Viseu, Benedita e todo o Portugal.",
  },
  "porta-paletes-eletrico": {
    title: "Porta-Paletes Elétricos",
    description: "Porta-paletes elétricos para movimentar cargas com maior eficiência. Consulte características e disponibilidade junto da Vasto Império, com apoio em Portugal.",
  },
  "porta-paletes-manual": {
    title: "Porta-Paletes Manuais",
    description: "Porta-paletes manuais para movimentação de cargas em armazéns e espaços comerciais. Consulte a solução da Vasto Império e peça um orçamento.",
  },
  stacker: {
    title: "Stackers para Armazém",
    description: "Stackers para elevação e movimentação de cargas em armazéns. Consulte os equipamentos disponíveis na Vasto Império, com apoio em Viseu, Benedita e Portugal.",
  },
};

// Geração estática de todos os IDs para pt e en
export function generateStaticParams() {
  const langs = ['pt', 'en'];
  const params = [];

  langs.forEach((lang) => {
    const content = lang === 'pt' ? contentpt : contenten;
    const products = content.productsShowcase.products;
    products.forEach((product) => {
      params.push({
        lang,
        id: String(product.id),
      });
    });
  });

  return params;
}

export async function generateMetadata({ params }) {
  const { lang, id } = await params;
  if (!["pt", "en"].includes(lang)) notFound();

  const contentData = lang === "pt" ? contentpt : contenten;

  const product = contentData.productsShowcase.products.find(
    (item) => item.id === decodeURIComponent(String(id))
  );

  if (!product) notFound();

  const canonicalPath = `/produtos/${lang}/${id}`;
  const localizedSeo = lang === "pt" ? portugueseProductSeo[product.id] : null;
  const title = localizedSeo?.title ?? product.text;
  const description = localizedSeo?.description ?? product.description;
  const languageAlternates = {};

  if (contentpt.productsShowcase.products.some((item) => item.id === product.id)) {
    languageAlternates["pt-PT"] = `/produtos/pt/${id}`;
    languageAlternates["x-default"] = `/produtos/pt/${id}`;
  }
  if (contenten.productsShowcase.products.some((item) => item.id === product.id)) {
    languageAlternates["en-US"] = `/produtos/en/${id}`;
    if (!languageAlternates["x-default"]) {
      languageAlternates["x-default"] = `/produtos/en/${id}`;
    }
  }

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: canonicalPath,
      languages: languageAlternates,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName: "Vasto Império",
      locale: lang === "pt" ? "pt_PT" : "en_US",
      type: "website",
      images: [
        {
          url: product.image,
          width: 800,
          height: 600,
          alt: product.text
        }
      ]
    }
  };
}

export default async function Page({ params }) {
  const { lang, id } = await params;
  if (!["pt", "en"].includes(lang)) notFound();

  const content = lang === "pt" ? contentpt : contenten;
  const text = content.productsShowcase;

  const product = content.productsShowcase.products.find(
    (item) => item.id === decodeURIComponent(String(id))
  );
  const handlingTab = product?.id === "porta-paletes-eletrico"
    ? "eletrico"
    : product?.id === "porta-paletes-manual"
      ? "manual"
      : product?.id === "stacker"
        ? "stacker"
        : null;
  const tabela = product?.tabela;
  const handlingCatalogNames = { eletrico: "Porta Paletes Elétrico - 1500Kg", manual: "Porta Paletes Manual - 3000Kg", stacker: "Stacker" };
  const handlingProduct = handlingTab ? budget.produtos.find((item) => item.ref === 5 && item.produto === handlingCatalogNames[handlingTab]) : null;
  const hasGallery = Boolean(product?.galeria?.length);
  const contactBackground = Boolean(tabela) === hasGallery ? "white" : "gray";

  if (!product) notFound();

  return (
    <>
      <main className="bg-[#f5f5f7] px-5 pb-16 pt-[76px] sm:px-8 sm:pt-[84px] lg:pb-20">
        <div className="mx-auto max-w-[1440px]">
          <nav aria-label={lang === "pt" ? "Navegação estrutural" : "Breadcrumb"} className="mb-7 text-sm text-[#7a7a80]">
            <Link href="/produtos" className="transition-colors hover:text-(--orange)">
              {lang === "pt" ? "Produtos" : "Products"}
            </Link>
            <span className="mx-2 text-[#b5b5ba]" aria-hidden="true">/</span>
            <span className="text-[#4e4e53]">{product.text}</span>
          </nav>
          <header className="mb-8 border-b border-[#e5e5e7] pb-6 sm:mb-10 sm:pb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--orange)">
              {lang === "pt" ? "Soluções de armazenagem" : "Storage solutions"}
            </p>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#1d1d1f] sm:text-4xl lg:text-5xl">
              {product.text}
            </h1>
          </header>
          {handlingTab && <SimulatorSectionTabs group="handling" active={handlingTab} lang={lang} />}
          <GalleryClient product={product} text={text} handlingProduct={handlingProduct} english={lang === "en"} />
        </div>
      </main>
      {tabela && (
        <section className="border-y border-[#e5e5e7] bg-white py-14 sm:py-16 lg:py-20">
          <ProductTabela tabela={tabela} />
        </section>
      )}
      {hasGallery && (
        <section className={`${tabela ? "bg-[#f5f5f7]" : "bg-white"} px-5 py-14 sm:px-8 sm:py-16 lg:py-20`}>
          <div className="mx-auto max-w-[1440px]">
            <header className="mb-8 flex flex-col gap-5 border-b border-[#dedee3] pb-7 sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:pb-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--orange)">
                  {lang === "pt" ? "No terreno" : "In the field"}
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1d1d1f] sm:text-4xl">{product.galeriaTitle}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#68686e] sm:text-base">
                  {lang === "pt" ? "Conheça algumas das soluções implementadas junto dos nossos clientes." : "Explore some of the solutions delivered for our customers."}
                </p>
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-[#dedee3] bg-white px-4 py-2 text-xs font-medium text-[#68686e] shadow-sm">
                {String(product.galeria.length).padStart(2, "0")} {lang === "pt" ? "fotografias" : "photos"}
              </span>
            </header>
            <Galeria images={product.galeria} alt={product.text} language={lang} />
          </div>
        </section>
      )}
      <ContactCard sectionBackground={contactBackground} />
    </>
  );
}
