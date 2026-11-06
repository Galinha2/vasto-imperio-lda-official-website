import { IoClose, IoMenuOutline } from "react-icons/io5";

function HamburgerMenu({isOpen, setIsOpen}) {

    return (
        <button type="button" data-mobile-menu-toggle aria-label={isOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={isOpen} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#e5e5e7] bg-white/85 text-[#303034] shadow-sm backdrop-blur-md transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0879c0]"
        onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <IoClose className="text-xl" /> : <IoMenuOutline className="text-xl" />}
        </button>
    )
}

export default HamburgerMenu
