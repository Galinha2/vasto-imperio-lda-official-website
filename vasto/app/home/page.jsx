import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Racks e Estantes Metálicas em Viseu",
  description: "Racks industriais, estantes metálicas e porta-paletes em Viseu e Benedita. Mais de 20 anos em soluções de armazenagem, com entregas em Portugal. Peça um orçamento gratuito.",
  path: "/",
  image: "/favicon-google.png",
});

import Cards from "@/components/home/Cards";
import Banner from "@/components/home/Banner";
import InfoIconsCards from "@/components/home/InfoIconsCards";
import ContactCard from "@/components/contacts/ContactCard";
import SimulatorCard from "@/components/home/SimulatorCard";

export default function Page() {
    return (
        <div className="overflow-hidden bg-white">
            <Banner />
            <section className="bg-white px-5 py-14 sm:px-8 sm:py-16 lg:py-20">
                <div className="mx-auto grid max-w-[1480px] items-stretch gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)] lg:gap-10">
                    <SimulatorCard />
                    <InfoIconsCards />
                </div>
            </section>
            <Cards />
            <ContactCard wide />
        </div>
    );
}
