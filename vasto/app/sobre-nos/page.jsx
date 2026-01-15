import Sobre from "@/components/sobre/Sobre"
import ContactCard from "@/components/contacts/ContactCard" 

function page() {
    return (
        <div className="mt-17 max-w-450">
            <Sobre />
            <ContactCard />
        </div>
    )
}

export default page
