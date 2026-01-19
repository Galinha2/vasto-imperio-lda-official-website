import ContactCard from "@/components/contacts/ContactCard"
import ContactHeader from "@/components/contacts/ContactHeader"

function page() {
    return (
        <div className="mt-25">
            <ContactHeader />
            <ContactCard />
        </div>
    )
}

export default page
