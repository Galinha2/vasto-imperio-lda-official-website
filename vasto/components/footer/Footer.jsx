function Footer() {
    return (
        <div className="z-1 bg-[var(--gray)] w-full p-5 text-center">
            <p>{`© ${new Date().getFullYear()} Vasto Império. Todos os direitos reservados.`}</p>
        </div>
    )
}

export default Footer
