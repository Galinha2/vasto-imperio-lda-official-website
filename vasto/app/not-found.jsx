import Link from "next/link"

function NotFound() {
    return (
        <div className="w-screen h-screen gap-5 flex flex-col items-center justify-center text-center">
            <img className="w-75" src="/404.png" alt="404 Error" />
            <h1 className="font-[300]">Página não encontrada</h1>
            <Link
                href="/"
                className="mt-3 bg-(--orange) text-white px-5 py-2 rounded-full shadow-md hover:opacity-90 transition"
            >
                Voltar à página inicial
            </Link>
        </div>
    )
}

export default NotFound
