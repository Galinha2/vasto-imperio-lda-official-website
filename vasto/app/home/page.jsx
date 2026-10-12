export const metadata = {
  title: "Racks, Estantes e Prateleiras Metálicas em Viseu e Benedita | Vasto Império",
  description:
    "A Vasto Império Lda fornece racks, estantes e prateleiras metálicas em Viseu e em todo o distrito. Soluções profissionais de armazenamento para empresas, armazéns e indústria, com entregas em todo o país."
};

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
                <div className="mx-auto grid max-w-[1480px] items-start gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)] lg:gap-10">
                    <SimulatorCard />
                    <InfoIconsCards />
                </div>
            </section>
            <Cards />
            <ContactCard />
        </div>
    );
}
