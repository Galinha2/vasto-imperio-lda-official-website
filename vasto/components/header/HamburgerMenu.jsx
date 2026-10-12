import { IoClose, IoMenuOutline } from "react-icons/io5";

function HamburgerMenu({isOpen, setIsOpen}) {

    return (
        <button type="button" aria-label={isOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={isOpen} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[#e5e5e7] bg-white/80 text-[#424245] transition hover:bg-[#f5f5f7]"
        onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <IoClose className="text-xl" /> : <IoMenuOutline className="text-xl" />}
        </button>
    )
}

export default HamburgerMenu
