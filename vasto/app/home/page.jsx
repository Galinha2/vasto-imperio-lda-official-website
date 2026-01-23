export const metadata = {
    default: "Racks e Prateleiras Metálicas em Viseu e Benedita | Vasto Império",
  description:
    "A Vasto Império Lda fornece racks e prateleiras metálicas em Viseu e em todo o distrito. Soluções profissionais de armazenamento para empresas, armazéns e indústria, com entregas em todo o país."
};

import Cards from "@/components/home/Cards";
import Banner from "@/components/home/Banner";
import InfoIconsCards from "@/components/home/InfoIconsCards";
import ContactCard from "@/components/contacts/ContactCard";

export default function Page() {
    return (
        <div>
            <Banner />
            <InfoIconsCards />
            <Cards />
            <ContactCard />
        </div>
    );
}
