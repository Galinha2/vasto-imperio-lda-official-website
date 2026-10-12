import Sobre from "@/components/sobre/Sobre"
import ContactCard from "@/components/contacts/ContactCard"

export const metadata = {
    title: "Sobre nós | Vasto Império",
};

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
