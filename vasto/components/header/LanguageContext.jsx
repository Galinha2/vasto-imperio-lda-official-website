"use client";

import { createContext, useContext, useEffect, useState } from "react";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("pt"); // idioma padrão

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("vasto-language");
    if (savedLanguage === "pt" || savedLanguage === "en") setLanguage(savedLanguage);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("vasto-language", language);
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
