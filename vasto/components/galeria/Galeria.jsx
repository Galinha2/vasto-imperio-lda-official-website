"use client";

import Image from "@/components/loadings/LoadingImage";
import { useEffect, useState } from "react";
import { IoClose } from "react-icons/io5";

const tileLayouts = [
  "col-span-2 row-span-2",
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-2 row-span-2",
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-2 row-span-2",
];

export default function Galeria({ images = [], alt = "Customer project", language = "pt" }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const isOpen = activeIndex !== null;

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") setActiveIndex((index) => (index + 1) % images.length);
      if (event.key === "ArrowLeft") setActiveIndex((index) => (index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, images.length]);

  if (!images.length) return null;

  return (
    <>
      <div className="grid auto-rows-[130px] grid-flow-dense grid-cols-2 gap-3 sm:auto-rows-[160px] sm:grid-cols-3 sm:gap-4 lg:auto-rows-[180px] lg:grid-cols-4">
        {images.map((image, index) => (
          <button
            key={image}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`${language === "pt" ? "Ver instalação" : "View installation"} ${index + 1}`}
            className={`group relative cursor-zoom-in overflow-hidden rounded-[22px] border border-[#e5e5e7] bg-white text-left shadow-[0_2px_10px_rgba(0,0,0,0.035)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(0,0,0,0.1)] sm:rounded-[26px] ${tileLayouts[index % tileLayouts.length]}`}
          >
            <Image
              src={image}
              alt={`${alt} — ${language === "pt" ? "instalação" : "installation"} ${index + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition duration-700 group-hover:scale-[1.04]"
            />
            <span className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.05] bg-white/95 text-xl text-[#1d1d1f] opacity-0 shadow-sm transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true">↗</span>
          </button>
        ))}
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setActiveIndex(null)}
        >
          <div className="relative h-[min(88vh,900px)] w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <Image src={images[activeIndex]} alt={`${alt} ${activeIndex + 1}`} fill sizes="95vw" className="object-contain" />
            <button type="button" onClick={() => setActiveIndex(null)} aria-label={language === "pt" ? "Fechar imagem" : "Close image"} className="absolute right-2 top-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-[#f5f5f7] text-2xl text-[#1d1d1f] shadow-sm transition hover:scale-105 sm:right-5 sm:top-5">
              <IoClose aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
