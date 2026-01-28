import { Inter_Tight } from 'next/font/google';
import "./globals.css";
import Header from "@/components/header/Header";
import { LanguageProvider } from "@/components/header/LanguageContext";
import Footer from '@/components/footer/Footer';
import { Analytics } from '@vercel/analytics/react';

const interTight = Inter_Tight({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter-tight',
})

export const metadata = {
  title: {
    default: "Racks e Prateleiras Metálicas em Viseu | Vasto Império",
    template: "%s | Vasto Império",
  },
  description:
    "A Vasto Império Lda fornece racks e prateleiras metálicas em Viseu e em todo o distrito. Soluções profissionais de armazenamento para empresas, armazéns e indústria, com entregas em todo o país.",
  keywords: [
    "racks Viseu",
    "prateleiras Viseu",
    "racks metálicos",
    "prateleiras metálicas",
    "armazenamento industrial",
    "equipamentos de armazém",
    "Vasto Império",
    "Viseu",
    "Portugal"
  ],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Racks e Prateleiras Metálicas em Viseu | Vasto Império",
    description:
      "Soluções profissionais em racks e prateleiras metálicas para empresas em Viseu e distrito. Qualidade, segurança e entregas rápidas.",
    url: "https://www.vastimperio.pt",
    siteName: "Vasto Império",
    locale: "pt_PT",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${interTight.variable} min-h-screen flex flex-col antialiased`}>
        <LanguageProvider>
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
