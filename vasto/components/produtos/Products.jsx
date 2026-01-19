"use client";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";
import Image from "next/image";
import Link from "next/link";

function Products() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const showcase = content.productsShowcase;

  const gridClasses = [
    "md:col-span-2 md:row-span-1",
    "md:col-start-1 md:row-start-2 md:row-span-2",
    "md:col-start-2 md:row-start-2",
    "md:col-start-2 md:row-start-3",
    "md:col-start-1 md:row-start-4 md:col-span-2",
    "md:col-start-1 md:row-start-5",
    "md:col-start-2 md:row-start-5 md:row-span-2",
    "md:col-start-1 md:row-start-6",
    "md:col-span-2 md:row-start-7 md:col-span-2",
    "md:col-start-1 md:row-start-8 md:row-span-2",
    "md:col-start-2 md:row-start-9",
    "md:col-start-2 md:row-start-9",
    "md:col-start-1 md:row-start-10 md:col-span-2",
  ];

  return (
    <div className="my-10">
      <div className="p-5 max-w-200 lg:max-w-250 m-auto flex flex-col md:grid md:grid-cols-2 md:grid-rows-3 gap-10">
        {showcase.products.map((product, index) => (
          <Link
            key={index}
            href={`/produtos/${product.id}`}
            className={`bg-(--gray) rounded-[35px] justify-between hover:shadow-lg cursor-pointer flex flex-col px-10 ${
              gridClasses[index]
            } ${
              (index === 0 || index === 4) &&
              "h-75 pt-5 md:pt-0 flex-col-reverse items-center justify-between md:h-70 lg:h-70 md:pr-25 md:items-end md:flex-row"
            } ${
              index === 1 || index === 6 || index === 9
                ? "items-center py-10 md:p-0 flex-col-reverse md:flex-col justify-center gap-5 h-75 md:h-150 lg:h-150"
                : ""
            } ${
              index >= 2 &&
              "h-75 md:h-70 lg:h-70 flex-col-reverse items-center justify-between pt-5"
            } ${
              index === 3 &&
              "h-75 md:h-70 lg:h-70 flex-col-reverse items-center justify-between pt-5"
            }`}
          >
            <Image
              src={product.image}
              alt={product.text}
              width={product.width || 200}
              height={product.height || 200}
              style={{
                maxWidth: product.maxWidth ? `${product.maxWidth}px` : "100%",
              }}
              className={`object-contain ${product.maxWidth && "md:w-full"}`}
            />
            <p className="self-center text-center text-[1.2em] font-medium">
              {product.text}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Products;
