"use client";

import { useState } from "react";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { useLanguage } from "./LanguageContext";

function LanguageSelection() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages = ["pt", "en"];

  return (
    <div className="relative">
      <button
        className="cursor-pointer flex gap-1 items-center justify-center bg-white hover:bg-[var(--selected)] shadow-md rounded-[20px] px-2 py-1.5"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <IoIosArrowUp /> : <IoIosArrowDown />}
        <p>{language}</p>
      </button>
      {isOpen && (
        <ul className="z-500 absolute mt-2 bg-white shadow-md rounded-[10px]">
          {languages.map((lang) => (
            <li
              key={lang}
              className="px-4 py-2 hover:bg-[var(--selected)] rounded-[10px] cursor-pointer"
              onClick={() => {
                setLanguage(lang);
                setIsOpen(false);
              }}
            >
              {lang}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LanguageSelection;
