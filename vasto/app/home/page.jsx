import surfaces from "@/components/home/HomeSurfaces.module.css";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Estantes Metálicas e Racks em Viseu e Portugal",
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
        <div className={`${surfaces.page} overflow-hidden`}>
            <Banner />
            <section className={`${surfaces.configurators} px-5 py-14 sm:px-8 sm:py-16 lg:py-20`}>
                <div className="mx-auto max-w-[1480px]">
                    <SimulatorCard />
                    <InfoIconsCards />
                </div>
            </section>
            <Cards />
            <div className={surfaces.contacts}><ContactCard wide /></div>
        </div>
    );
}
