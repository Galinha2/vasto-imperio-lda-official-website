"use client";

import { useEffect, useState } from "react";
import Image from "@/components/loadings/LoadingImage";
import Link from "next/link";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { IoClose } from "react-icons/io5";
import HandlingOrderPanel from "@/components/produtos/HandlingOrderPanel";

const simulatorLinks = {
  "racks-industriais": "/simulador/racks",
  "estante-carga-ligeira": "/simulador/estantes-ligeiras",
  "estantes-picking": "/simulador/pt/estantes-picking",
};

export default function GalleryClient({ product, text, handlingProduct, english = false }) {
  const images = product.images?.length ? product.images : [product.image];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const hasMultipleImages = images.length > 1;
  const simulatorHref = simulatorLinks[product.id]?.replace("/pt/", english ? "/en/" : "/pt/");

  const showImage = (index) => setCurrentImageIndex((index + images.length) % images.length);
  const handleNextImage = () => showImage(currentImageIndex + 1);
  const handlePrevImage = () => showImage(currentImageIndex - 1);

  useEffect(() => {
    if (!isModalOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsModalOpen(false);
      if (event.key === "ArrowRight") handleNextImage();
      if (event.key === "ArrowLeft") handlePrevImage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, currentImageIndex]);

  return (
    <>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] lg:gap-12">
        <div className="min-w-0">
          <div className="group relative aspect-[4/3] overflow-hidden rounded-[28px] border border-[#e5e5e7] bg-white sm:rounded-[32px]" style={{ backgroundColor: "#fff" }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              aria-label={text?.verImagem || `View ${product.text} image`}
              className="absolute inset-0 z-0 flex h-full w-full cursor-zoom-in items-center justify-center bg-white p-6 sm:p-10"
              style={{ backgroundColor: "#fff" }}
            >
              <Image
                src={images[currentImageIndex]}
                alt={product.text}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-contain p-6 transition duration-500 group-hover:scale-[1.025] sm:p-10"
              />
            </button>

            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  aria-label={text?.imagemAnterior || "Previous image"}
                  className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-black/[0.06] bg-white/90 text-2xl text-[#1d1d1f] shadow-md backdrop-blur transition hover:scale-105 hover:bg-white"
                >
                  <IoIosArrowBack aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  aria-label={text?.proximaImagem || "Next image"}
                  className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-black/[0.06] bg-white/90 text-2xl text-[#1d1d1f] shadow-md backdrop-blur transition hover:scale-105 hover:bg-white"
                >
                  <IoIosArrowForward aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {hasMultipleImages && (
            <div className="simulator-dropdown-scroll mt-4 flex gap-3 overflow-x-auto pb-2">
              {images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => showImage(index)}
                  aria-label={`${text?.imagem || "Image"} ${index + 1}`}
                  aria-current={index === currentImageIndex ? "true" : undefined}
                  className={`relative h-[76px] w-[92px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border bg-white p-2 transition sm:h-[88px] sm:w-[108px] ${index === currentImageIndex ? "border-(--orange) ring-2 ring-(--orange)/15" : "border-[#e5e5e7] hover:border-[#b7b7bd]"}`}
                >
                  <Image src={image} alt="" fill sizes="108px" className="object-contain p-2" />
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-[28px] border border-[#e5e5e7] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.035)] sm:p-7 lg:sticky lg:top-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-(--orange)">{text.caracteristicas}</p>
          <div
            className="product-description mt-5 text-sm leading-[1.75] text-[#55565c] sm:text-base"
            dangerouslySetInnerHTML={{ __html: product.description || "" }}
          />
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row lg:flex-col">
            {simulatorHref && (
              <Link href={simulatorHref} className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-(--orange) px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-(--orange-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--orange)">
                {text?.caracteristicas === "Características" ? "Simular configuração" : "Configure in the simulator"}
                <span aria-hidden="true">→</span>
              </Link>
            )}
            <Link href="/orcamento" className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-6 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1f]">
              {text?.contacte || (text?.caracteristicas === "Características" ? "Pedir informações" : "Request information")}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          {handlingProduct && <HandlingOrderPanel product={handlingProduct} label={product.text} imageSrc={product.image} english={english} embedded />}
        </aside>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white p-4 sm:p-8"
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={product.text}
        >
          <div className="relative h-[min(88vh,900px)] w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <Image src={images[currentImageIndex]} alt={product.text} fill sizes="95vw" className="object-contain" />
            {hasMultipleImages && (
              <>
                <button type="button" onClick={handlePrevImage} aria-label={text?.imagemAnterior || "Previous image"} className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-2xl text-[#1d1d1f] shadow-lg transition hover:bg-white sm:left-5"><IoIosArrowBack aria-hidden="true" /></button>
                <button type="button" onClick={handleNextImage} aria-label={text?.proximaImagem || "Next image"} className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-2xl text-[#1d1d1f] shadow-lg transition hover:bg-white sm:right-5"><IoIosArrowForward aria-hidden="true" /></button>
              </>
            )}
            <button type="button" onClick={() => setIsModalOpen(false)} aria-label={text?.fechar || "Close"} className="absolute right-2 top-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/90 text-2xl text-[#1d1d1f] shadow-lg transition hover:scale-105 hover:bg-white sm:right-5 sm:top-5"><IoClose aria-hidden="true" /></button>
          </div>
        </div>
      )}
    </>
  );
}
