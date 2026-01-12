import { Inter_Tight } from 'next/font/google';
import "./globals.css";
import Header from "@/components/header/Header";
import { LanguageProvider } from "@/components/header/LanguageContext";
import Footer from '@/components/footer/Footer';

const interTight = Inter_Tight({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter-tight',
});

export const metadata = {
  title: {
    default: "Vasto Império",
    template: "%s - Vasto Império",
  },
  description: "Vasto Império Lda Official Website",
  icons: {
    icon: "/favicon.ico",
  }
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
      </body>
    </html>
  );
}
