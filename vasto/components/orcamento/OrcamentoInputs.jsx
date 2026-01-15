"use client";
import { useState } from "react";
import Spinner from "../loadings/Spinner";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";
import { FiUpload } from "react-icons/fi";
import { useRouter } from "next/navigation";

export default function OrcamentoInputs() {
    const { language } = useLanguage();
      const content = language === "pt" ? contentpt : contenten;
      const item = content.orcamento;

    const [files, setFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    async function handleSubmit(event) {
        event.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('name', event.target.name.value);
        formData.append('email', event.target.email.value);
        formData.append('phone', event.target.phone.value);
        formData.append('body', event.target.body.value);
        files.forEach((file) => {
            formData.append('files', file);
        });

        try {
            const response = await fetch('/api/orcamento', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                router.push("/sucesso?enviado=true");
            } else {
                setIsSubmitting(false);
                alert(language === "pt"
                    ? "Ocorreu um erro ao enviar o formulário. Por favor, tente novamente."
                    : "An error occurred while sending the form. Please try again.");
                // permanece na página /orcamento
            }
        } catch (error) {
            setIsSubmitting(false);
            alert(language === "pt"
                ? "Ocorreu um erro ao enviar o formulário. Por favor, tente novamente."
                : "An error occurred while sending the form. Please try again.");
            // permanece na página /orcamento
        }
    }

    return (
        <div className="p-5 pt-20 w-full max-w-200 m-auto relative">
            {isSubmitting && (
                <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
                    <div className="flex flex-col items-center justify-center gap-5">
                        <Spinner />
                        <p className="text-(--orange) font-medium text-[1.2em]">{item.send}</p>
                    </div>
                </div>
            )}
            <h1 className="title mb-5 text-center">{item.title}</h1>
            <form
                className="p-5 bg-(--gray) w-auto rounded-[35px] flex gap-5 flex-col"
                onSubmit={handleSubmit}
            >
                <div className="flex gap-5">
                    <input
                        className="input"
                        type="text"
                        name="name"
                        id="name"
                        placeholder={item.nome}
                        required
                    />
                    <input
                        className="input"
                        type="tel"
                        name="phone"
                        id="phone"
                        placeholder={item.phone}
                        required
                    />
                </div>
                <input
                    className="input"
                    type="email"
                    name="email"
                    id="email"
                    placeholder={item.mail}
                    required
                />
                <textarea
                    className="h-70 pt-5 input resize-none align-top"
                    name="body"
                    id="body"
                    placeholder={item.body}
                    required
                />
                {files.length < 3 && (
                    <label className="bg-white shadow-sm px-5 py-2 rounded-full w-fit cursor-pointer">
                        <div><FiUpload className="inline mr-2" />{item.anexo}</div>
                        <input
                            type="file"
                            name="files"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                const selected = Array.from(e.target.files);
                                setFiles((prev) => [...prev, ...selected].slice(0, 3));
                                e.target.value = "";
                            }}
                        />
                    </label>
                )}

                <div className="flex flex-wrap gap-5">
                    {files.map((file, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-3 bg-white shadow-sm px-5 py-2 rounded-full w-fit"
                        >
                            <span className="text-sm max-w-[200px] truncate">{file.name}</span>
                            <button
                                type="button"
                                className="text-(--orange) font-bold"
                                onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    type="submit"
                    className="-mt-5 bg-(--orange) text-white px-5 py-2 rounded-full shadow-md w-fit cursor-pointer self-end"
                    disabled={isSubmitting}
                >
                    {item.submit}
                </button>
            </form>
        </div>
    );
}
