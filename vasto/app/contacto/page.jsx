
import ContactCard from "@/components/contacts/ContactCard"
import ContactHeader from "@/components/contacts/ContactHeader"
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Contacto em Viseu e Benedita",
  description: "Contacte a Vasto Império para racks, estantes metálicas e porta-paletes. Fale com as equipas de Viseu e Benedita ou peça um orçamento online.",
  path: "/contacto",
});

function page() {
    return (
        <div className="bg-[#f5f5f7] pt-[76px]">
            <ContactHeader />
            <ContactCard wide />
        </div>
    )
}

export default page
