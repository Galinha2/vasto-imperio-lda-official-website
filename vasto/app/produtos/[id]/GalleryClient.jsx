"use client";

import { useState } from "react";
import Image from "next/image";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { IoClose } from "react-icons/io5";

export default function GalleryClient({ product, text }) {
  const images =
    product.images && product.images.length > 0
      ? product.images
      : [product.image];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasMultipleImages = images.length > 1;

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const openModal = (index) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="flex w-full items-center max-w-450 m-auto justify-center md:justify-start md:gap-5 lg:gap-10 xl:gap-30 md:items-start flex-col md:flex-row gap-5">
        <div className="flex p-4 flex-col items-center md:flex-row justify-center bg-white w-100 h-100 md:min-w-100 lg:min-w-150 lg:min-h-160 shadow-lg rounded-[35px] relative">
          <Image
            src={images[currentImageIndex]}
            alt={product.text}
            width={600}
            height={600}
            className="cursor-pointer w-auto max-h-100 lg:max-h-150"
            onClick={() => openModal(currentImageIndex)}
          />

          {hasMultipleImages && (
            <div className="absolute top-[40%] lg:top-[43%] left-1/2 transform -translate-x-1/2 flex gap-70 lg:gap-120">
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

        <div className="flex mt-5 md:mt-0 md:items-start md:justify-start flex-col gap-2">
          <p className="text-(--blue) text-center md:text-left">
            {text.caracteristicas}
          </p>

          <div className="text-center max-w-150 gap-2 m-auto flex flex-col items-start bg-(--gray) p-5 rounded-[35px]">

            {product.description && (
              <div
                className="text-left"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white"
          onClick={closeModal}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <Image
              src={images[currentImageIndex]}
              alt={product.text}
              width={800}
              height={800}
            />
            <button
              onClick={closeModal}
              className="absolute top-0 right-2 cursor-pointer text-(--orange) p-2 text-4xl"
            >
              <IoClose />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
