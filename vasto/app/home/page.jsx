export const metadata = {
    title: "Home",
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
