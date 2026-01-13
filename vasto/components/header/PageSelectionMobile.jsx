"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "./LanguageContext";
import { IoIosClose } from "react-icons/io";
import { useEffect } from "react";

export default function PageSelectionMobile({ isOpen, setIsOpen }) {
  const { language } = useLanguage();
  const pathname = usePathname();
  const content = language === "pt" ? contentpt : contenten;

  // Bloquear scroll quando o menu mobile estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  return (
    <div className={`${isOpen ? "block" : "hidden"} relative z-50`}>
      {/* Overlay atrás do menu */}
      <div
        className="fixed top-0 left-0 w-full h-screen bg-[var(--blur)] backdrop-blur-[1.5px] z-40"
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Menu */}
      <ul className="fixed right-0 top-0 bg-white w-80 h-screen z-50 flex flex-col py-5 gap-4">
        <div className="flex px-3 justify-between w-full">
          <Image
            src={content.header.logoMini}
            alt="Vasto Império Logo"
            width={50}
            height={50}
            priority
          />
          <IoIosClose
            className="self-end hover:text-[var(--orange)] bg-white shadow-md rounded-full w-8 h-8 active:p-0.5 cursor-pointer"
            onClick={() => setIsOpen(false)}
          />
        </div>
        {content.header.links.map((item) => (
          <li key={item.url}>
            <Link
              href={item.url}
              className={`w-75 px-5 py-1 inline-flex items-left rounded-[20px_0px] justify-left hover:text-[var(--orange)] text-left ${
                pathname === item.url
                  ? "bg-white shadow-md text-[var(--orange)]"
                  : ""
              }`}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
