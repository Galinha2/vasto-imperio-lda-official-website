
import ContactCard from "@/components/contacts/ContactCard"
import ContactHeader from "@/components/contacts/ContactHeader"

export const metadata = {
  title: "Contacto | Vasto Império",
};

function page() {
    return (
        <div className="bg-[#f5f5f7] pt-[76px]">
            <ContactHeader />
            <ContactCard wide />
        </div>
    )
}

export default page
