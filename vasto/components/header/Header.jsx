"use client";

import Image from "@/components/loadings/LoadingImage";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import PageSelection from "./PageSelection";
import PageSelectionMobile from "./PageSelectionMobile";
import { useLanguage } from "./LanguageContext";
import LanguageSelection from "./LanguageSelection";
import HamburgerMenu from "./HamburgerMenu";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function Header() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const [isOpen, setIsOpen] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const controlHeader = () => {
      if (typeof window !== "undefined") {
        const isMobile = window.innerWidth < 768; // só mobile
        if (!isMobile) return;

        if (window.scrollY > lastScrollY.current + 10 && window.scrollY > 50) {
          // scroll down
          setShowHeader(false);
        } else if (window.scrollY < lastScrollY.current) {
          // scroll up
          setShowHeader(true);
        }
        lastScrollY.current = window.scrollY;
      }
    };

    window.addEventListener("scroll", controlHeader);
    return () => {
      window.removeEventListener("scroll", controlHeader);
    };
  }, []);

  return (
    <div
      className={`fixed left-0 top-0 z-50 w-full px-3 pt-2 transition-transform duration-300 sm:px-5 ${
        showHeader ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between rounded-full border border-white/70 bg-white/88 px-4 shadow-[0_8px_30px_rgba(29,29,31,0.08)] backdrop-blur-xl sm:px-6">
        <Link href="/home" aria-label="Vasto Império — página inicial" className="flex shrink-0 items-center">
          <Image
            src={content.header.logo}
            alt="Vasto Império Logo"
            width={68}
            height={68}
            priority
            className="h-12 w-12 object-contain sm:h-[52px] sm:w-[52px]"
          />
        </Link>
        <div className="flex items-center">
          {/* Menu Desktop */}
          <div className="hidden md:flex">
            <PageSelection />
          </div>
          {/* Menu Mobile */}
          <div className="flex md:hidden">
            <PageSelectionMobile isOpen={isOpen} setIsOpen={setIsOpen} />
          </div>
        </div>
        <div className="flex gap-2 md:hidden">
          <LanguageSelection />
          <HamburgerMenu isOpen={isOpen} setIsOpen={setIsOpen} />
        </div>
      </div>
    </div>
  );
}
