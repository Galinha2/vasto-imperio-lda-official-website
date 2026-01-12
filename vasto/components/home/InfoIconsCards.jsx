import { IoIosClose } from "react-icons/io";

function InfoIconsCards() {
    return (
        <div className="bg-[var(--gray)] m-auto flex items-center justify-center rounded-[35px] w-100 h-30 p-2 gap-4">
            <IoIosClose className="text-[var(--orange)] bg-white shadow-md p-2 rounded-full w-20 h-20" />
            <div>
                <h1 className="font-semibold">Info Icons Cards</h1>
                <p className="text-[var(--text-gray)]">Lore ipsum dolor sit amet, dolore magna aliqua.</p>
            </div>
        </div>
    )
}

export default InfoIconsCards
