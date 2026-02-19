import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import GalleryClient from "./GalleryClient";
import ContactCard from "@/components/contacts/ContactCard";
import ProductTabela from "@/components/produtos/ProductTabela";
import Galeria from "@/components/galeria/Galeria";

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

  const contentData = lang === "pt" ? contentpt : contenten;

  const product = contentData.productsShowcase.products.find(
    (item) => item.id === decodeURIComponent(String(id))
  );

  if (!product) {
    return {
      title: "Produto não encontrado | Vasto Império",
      description: "O produto que procura não foi encontrado."
    };
  }

  const canonicalUrl = `https://www.vastoimperio.pt/produtos/${lang}/${id}`;

  return {
    title: `${product.text} | Vasto Império`,
    description: product.description,
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      title: `${product.text} | Vasto Império`,
      description: product.description,
      url: canonicalUrl,
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

  const content = lang === "pt" ? contentpt : contenten;
  const text = content.productsShowcase;

  const product = content.productsShowcase.products.find(
    (item) => item.id === decodeURIComponent(String(id))
  );
  const tabela = product?.tabela;

  if (!product) {
    return (
      <div className="p-10 mt-17 text-center">
        <p className="text-xl font-medium">{text.produtoNe}</p>
      </div>
    );
  }

  return (
    <>
      <div className={`mt-17 m-auto pt-10 px-5 2xl:px-30 xl:px-5 pb-20 font-medium flex flex-col gap-10 ${!tabela && "border-b border-(--horizontal-line) mb-10"}`}>
        <h1 className="w-full max-w-450 m-auto title -mb-7">{product.text}</h1>

        <GalleryClient product={product} text={text} />
      </div>
      {tabela && (
        <div className={`border-b border-(--horizontal-line) pb-5 mb-15`}>
          <ProductTabela product={product} />
        </div>
      )}
      {product.galeria && product.galeria.length > 0 && (
        <div className="mb-20 border-b border-(--horizontal-line) -mt-15 py-20 bg-(--gray) p-5">
          <h1 className="title m-auto max-w-200 text-center mb-5">{product.galeriaTitle}</h1>
          <Galeria productId={product.id} />
        </div>
      )}
      <ContactCard />
    </>
  );
}