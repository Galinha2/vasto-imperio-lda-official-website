function ContactHeader() {
    return (
        <div className="flex flex-col items-center justify-center border-b border-(--horizontal-line) mb-20">
            <img className="z-2 relativew-70 w-70 md:w-80 lg:w-90" src="/logo.png" alt="logo" />
            <img className="z-2 relativew-70 w-70 md:w-80 lg:w-90" src="/pricing-dots.png" alt="dots" />
            <img className="z-2 relativew-70 w-70 md:w-80 lg:w-90" src="/phone.png" alt="phone" />
            <img className="z-1 absolute w-screen h-146 lg:h-181 -top-0" src="/background.png" alt="background" />
        </div>
    )
}

export default ContactHeader
