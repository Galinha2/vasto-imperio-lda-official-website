"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "./LanguageContext";
import { IoIosClose } from "react-icons/io";

export default function PageSelection({ isOpen, setIsOpen }) {
  const { language } = useLanguage();
  const pathname = usePathname();
  const content = language === "pt" ? contentpt : contenten;

  return (
    <div className={`${isOpen ? "block" : "hidden"} z-10000000000`}>
      <div
        className="absolute top-0 inset-0 bg-[var(--blur)] backdrop-blur-[1.5px]"
        onClick={() => setIsOpen(!isOpen)}
      ></div>

      <ul className="absolute right-0 top-0 bg-white w-80 justify-start items-start py-5 h-screen flex flex-col gap-4">
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
            onClick={() => setIsOpen(!isOpen)}
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
