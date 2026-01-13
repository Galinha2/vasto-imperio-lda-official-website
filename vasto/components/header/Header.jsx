"use client";

import Image from "next/image";
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
      className={`fixed top-0 left-0 w-full z-50 bg-[var(--gray)] py-1 shadow-md transition-transform duration-300 ${
        showHeader ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="max-w-450 m-auto flex items-center justify-between px-4">
        <Link href="/home">
          <Image
            src={content.header.logo}
            alt="Vasto Império Logo"
            width={80}
            height={80}
            priority
          />
        </Link>
        <div className="flex items-center gap-4">
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