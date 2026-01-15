import OrcamentoInputs from "@/components/orcamento/OrcamentoInputs"
import ContactCard from "@/components/contacts/ContactCard"

function Page() {
    return (
        <div className="mt-17 max-w-450 flex flex-col gap-20">
            <OrcamentoInputs />
            <ContactCard />
        </div>
    )
}

export default Page
