"use client";
import { use } from "react";
import { useSearchParams } from "next/navigation";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import Image from "next/image";
import ContactCard from "@/components/contacts/ContactCard";
import { useState } from "react";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { IoClose } from "react-icons/io5";

export default function Page({ params, searchParams: ss }) {
  const resolvedParams = use(params);
  const resolvedSearchParams = use(ss);

  const searchParams = useSearchParams(); // fallback no client
  const lang =
    resolvedSearchParams?.lang || searchParams?.get("lang") === "en"
      ? "en"
      : "pt";
  const content = lang === "pt" ? contentpt : contenten;
  const text = content.productsShowcase;

  const id = resolvedParams.id;
  const product = content.productsShowcase.products.find(
    (item) => item.id === id
  );

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (index) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  if (!product) {
    return (
      <div className="p-10 mt-17 text-center">
        <p className="text-xl font-medium">{text.produtoNe}</p>
      </div>
    );
  }

  const images = product.images || [product.image];
  const hasMultipleImages = images.length > 1;

  const handleNextImage = () =>
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const handlePrevImage = () =>
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <>
      <div className="mt-17 m-auto p-5 pb-20 font-medium flex flex-col gap-10 border-b border-(--horizontal-line) mb-10">
        <h1 className="w-full max-w-450 m-auto title -mb-7">{product.text}</h1>

        <div className="flex w-full items-center max-w-450 m-auto justify-center md:justify-start md:gap-5 lg:gap-10 xl:gap-30 md:items-start flex-col md:flex-row gap-5">
            <div className="flex p-4 flex-col items-center md:flex-row justify-center bg-(--gray) w-100 h-100 md:min-w-100 lg:min-w-150 lg:min-h-160 shadow-lg rounded-[35px] relative">
              <Image
                src={images[currentImageIndex]}
                alt={product.text}
                width={600}
                height={600}
                className="cursor-pointer"
                onClick={() => openModal(currentImageIndex)}
              />
              {hasMultipleImages && (
                <div className="absolute top-[40%] lg:top-[43%] left-1/2 transform -translate-x-1/2 flex gap-70 lg:gap-120 mt-4">
                  <button onClick={handlePrevImage} className="buttonGallery">
                    <IoIosArrowBack
                      style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.5))" }}
                    />
                  </button>
                  <button onClick={handleNextImage} className="buttonGallery">
                    <IoIosArrowForward
                      style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.5))" }}
                    />
                  </button>
                </div>
              )}
              {hasMultipleImages && (
                <div className="absolute top-[91%] lg:top-[94%] left-1/2 transform -translate-x-1/2 flex justify-center gap-2 mt-4">
                  {images.map((_, index) => (
                    <span
                      key={index}
                      className={`w-3 h-3 rounded-full transition-colors duration-300 shadow-md ${
                        index === currentImageIndex ? "bg-white" : "bg-gray-400"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex mt-5 md:mt-0 md:items-start md:justify-start flex-col gap-2">
              <p className="text-(--blue) text-center md:text-left">{text.caracteristicas}</p>
              <div className="text-center max-w-150 gap-2 m-auto flex flex-col items-start bg-(--gray) p-5 rounded-[35px]">
                {product.material && (
                  <div className="flex gap-1 text-left">
                    <p className="font-medium text-(--orange)">
                      {product.materialText}
                    </p>
                    <p>{product.material}</p>
                  </div>
                )}
                {product.medidas && (
                  <div className="flex gap-1 text-left">
                    <p className="font-medium text-(--orange)">
                      {product.medidasText}
                    </p>
                    <p>{product.medidas}</p>
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
      <ContactCard />
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white"
          onClick={closeModal}
        >
          <div className="relative" onClick={e => e.stopPropagation()}>
            <Image
              src={images[currentImageIndex]}
              alt={product.text}
              width={800}
              height={800}
            />
            <button
              onClick={closeModal}
              className="absolute top-0 cursor-pointer right-2 text-(--orange) p-2 text-4xl"
            >
              <IoClose />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
