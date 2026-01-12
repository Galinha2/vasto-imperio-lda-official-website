function Footer() {
    return (
        <div className="bg-[var(--gray)] w-screen p-5 text-center">
            <p>{`© ${new Date().getFullYear()} Company. All rights reserved.`}</p>
        </div>
    )
}

export default Footer
