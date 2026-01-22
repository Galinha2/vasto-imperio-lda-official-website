"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";

function Galeria({ productId }) {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const products = content.productsShowcase.products || [];

  // Only select the product matching the ID, do not fallback
  if (!productId) return null;

  const normalizedId = decodeURIComponent(String(productId)).toLowerCase();
  const product = products.find(
    p => p.id && p.id.toLowerCase() === normalizedId
  );

  const images = product?.galeria || [];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [product?.id]);

  const hasMultipleImages = images.length > 1;

  const handlePrevImage = () => {
    setCurrentImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  if (!product || images.length === 0) return null;

  return (
    <div className="flex px-2 flex-col items-center md:flex-row justify-center bg-white lg:max-w-200 shadow-lg rounded-[35px] max-w-120 md:max-w-120 h-110 md:h-130 relative m-auto">

      <Image
        src={images[currentImageIndex]}
        alt={product.text}
        width={600}
        height={600}
        className="cursor-pointer w-auto max-h-[400px] lg:max-h-[500px] rounded-[35px]"
      />

      {hasMultipleImages && (
        <div className="absolute top-[40%] lg:top-[43%] left-1/2 transform -translate-x-1/2 flex gap-80 lg:gap-160">
          <button onClick={handlePrevImage} className="buttonGallery">
            <IoIosArrowBack />
          </button>
          <button onClick={handleNextImage} className="buttonGallery">
            <IoIosArrowForward />
          </button>
        </div>
      )}

      {hasMultipleImages && (
        <div className="absolute top-[91%] lg:top-[94%] left-1/2 transform -translate-x-1/2 flex justify-center gap-2">
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
  );
}

export default Galeria;