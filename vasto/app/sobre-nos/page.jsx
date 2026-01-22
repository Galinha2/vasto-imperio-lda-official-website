import Sobre from "@/components/sobre/Sobre"
import ContactCard from "@/components/contacts/ContactCard" 

export const metadata = {
    title: "Sobre nós | Vasto Império",
};

function page() {
    return (
        <div className="mt-17 m-auto">
            <Sobre />
            <div className="m-auto -mt-30 w-full">
                <ContactCard />
            </div>
        </div>
    )
}

export default page;
 