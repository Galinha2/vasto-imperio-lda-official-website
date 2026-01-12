import { IoIosMenu } from "react-icons/io";

function HamburgerMenu({isOpen, setIsOpen}) {

    return (
        <button className="block cursor-pointer flex items-center justify-center w-9 h-9 p-1 font-black bg-white active:p-[5px] hover:bg-[var(--selected)] shadow-md rounded-full"
        onClick={() => setIsOpen(!isOpen)}>
            <IoIosMenu className="hover:text-[var(--orange)] text-[2em]" />  
        </button>
    )
}

export default HamburgerMenu
