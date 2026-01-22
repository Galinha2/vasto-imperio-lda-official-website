function Footer() {
    return (
        <div className="bg-[var(--gray)] w-screen p-5 text-center">
            <p>{`© ${new Date().getFullYear()} Vasto Império. Todos os direitos reservados.`}</p>
        </div>
    )
}

export default Footer
