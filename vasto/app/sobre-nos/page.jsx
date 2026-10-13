import Sobre from "@/components/sobre/Sobre"
import ContactCard from "@/components/contacts/ContactCard"
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
    title: "Sobre a Vasto Império",
    description: "Conheça a Vasto Império: mais de 20 anos em racks, estantes metálicas, porta-paletes e equipamentos de armazenagem, com presença em Viseu e Benedita.",
    path: "/sobre-nos",
});

function page() {
    return (
        <div className="m-auto bg-[#f5f5f7]">
            <Sobre />
            <div className="m-auto w-full">
                <ContactCard wide />
            </div>
        </div>
    )
}

export default page;
