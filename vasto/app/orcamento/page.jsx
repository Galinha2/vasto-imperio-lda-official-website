"use client"
import OrcamentoInputs from "@/components/orcamento/OrcamentoInputs"
import ContactCard from "@/components/contacts/ContactCard"

function Page() {
    return (
        <div className="mt-17 m-auto flex flex-col gap-20">
            <OrcamentoInputs />
            <ContactCard />
        </div>
    )
}

export default Page
