import Sobre from "@/components/sobre/Sobre"
import ContactCard from "@/components/contacts/ContactCard" 

function page() {
    return (
        <div className="mt-17 max-w-450">
            <Sobre />
            <div className="m-auto -mt-30 w-screen">
                <ContactCard />
            </div>
        </div>
    )
}

export default page
