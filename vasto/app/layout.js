import { Inter_Tight } from 'next/font/google';
import "./globals.css";
import Header from "@/components/header/Header";
import { LanguageProvider } from "@/components/header/LanguageContext";
import Footer from '@/components/footer/Footer';
import { Analytics } from '@vercel/analytics/react';

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Vasto Império, Lda.",
  url: "https://vastoimperio.pt",
  logo: "https://vastoimperio.pt/favicon-google.png",
  email: ["geral@vastoimperio.pt", "vastoimperio@sapo.pt"],
  telephone: ["+351 928 348 117", "+351 966 518 436"],
  areaServed: [
    { "@type": "City", name: "Viseu" },
    { "@type": "Place", name: "Benedita" },
    { "@type": "Country", name: "Portugal" },
  ],
  knowsAbout: [
    "Racks industriais para paletes",
    "Estantes metálicas",
    "Estantes de carga ligeira",
    "Estantes de picking",
    "Porta-paletes manuais e elétricos",
    "Equipamentos de armazenagem",
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+351 928 348 117",
      email: "geral@vastoimperio.pt",
      contactType: "sales",
      areaServed: "Viseu",
      availableLanguage: "Portuguese",
    },
    {
      "@type": "ContactPoint",
      telephone: "+351 966 518 436",
      email: "vastoimperio@sapo.pt",
      contactType: "sales",
      areaServed: "Benedita",
      availableLanguage: "Portuguese",
    },
  ],
};

const interTight = Inter_Tight({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter-tight',
})

export const metadata = {
  metadataBase: new URL("https://vastoimperio.pt"),
  title: {
    default: "Estantes Metálicas e Racks em Viseu e Portugal | Vasto Império",
    template: "%s | Vasto Império",
  },
  description:
    "Racks industriais, estantes metálicas e porta-paletes em Viseu e Benedita. Mais de 20 anos em soluções de armazenagem, com entregas em Portugal. Peça um orçamento gratuito.",
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
    icon: [
      { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Estantes Metálicas e Racks em Viseu e Portugal | Vasto Império",
    description:
      "Racks industriais, estantes metálicas e porta-paletes em Viseu e Benedita. Soluções de armazenagem para empresas, com entrega em Portugal.",
    url: "https://vastoimperio.pt",
    siteName: "Vasto Império",
    locale: "pt_PT",
    type: "website",
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData).replace(/</g, "\\u003c") }}
        />
        <meta name="color-scheme" content="only light" />
        <meta name="theme-color" content="#ffffff" />
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
