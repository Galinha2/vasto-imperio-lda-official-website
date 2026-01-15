import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import GalleryClient from "./GalleryClient";
import ContactCard from "@/components/contacts/ContactCard";
import Image from "next/image";

// Geração estática de todos os IDs
export function generateStaticParams() {
  const products = contentpt.productsShowcase.products;
  return products.map((product) => ({
    id: String(product.id),
  }));
}

export default async function Page({ params }) {
  // Se params for Promise, podemos usar await
  const { id } = await params;

  const lang = "pt"; // Export estático, apenas pt por build
  const content = lang === "pt" ? contentpt : contenten;
  const text = content.productsShowcase;

  const product = content.productsShowcase.products.find(
    (item) => String(item.id) === String(id)
  );

  if (!product) {
    return (
      <div className="p-10 mt-17 text-center">
        <p className="text-xl font-medium">{text.produtoNe}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-17 m-auto pt-10 px-5 2xl:px-30 xl:px-5 pb-20 font-medium flex flex-col gap-10 border-b border-(--horizontal-line) mb-10">
        <h1 className="w-full max-w-450 m-auto title -mb-7">{product.text}</h1>

        <GalleryClient product={product} text={text} />
      </div>

      <ContactCard />
    </>
  );
}