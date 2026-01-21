"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Spinner from "../loadings/Spinner";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";
import { FiUpload } from "react-icons/fi";

export default function OrcamentoInputs() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const item = content.orcamento;

  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formDataState, setFormDataState] = useState({
    name: "",
    phone: "",
    email: "",
    body: "",
  });
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormDataState((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit() {
    if (files.length > 3) {
      alert("Apenas é permitido até três ficheiros (imagem ou PDF).");
      return;
    }
    if (files.some(file => file.size > 10 * 1024 * 1024)) {
      const largeFile = files.find(file => file.size > 10 * 1024 * 1024);
      alert(`O ficheiro "${largeFile.name}" excede 10MB e não será enviado.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", formDataState.name);
      formData.append("phone", formDataState.phone);
      formData.append("email", formDataState.email);
      formData.append("body", formDataState.body);
      files.forEach((file, index) => {
        formData.append(`attachment${index}`, file);
      });

      const response = await fetch("/api/orcamento", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        router.replace("/sucesso?enviado=true");
      } else {
        const data = await response.json();
        console.error("Erro do backend:", data);
        alert("Erro ao enviar o formulário. Por favor, tente novamente.");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Erro no envio:", error);
      alert("Erro ao enviar o formulário. Por favor, tente novamente.");
      setIsSubmitting(false);
    }
  }

  if (!mounted) return null;
  return (
    <div className="p-5 pt-20 w-full max-w-200 m-auto relative">
      {isSubmitting && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="flex flex-col items-center justify-center gap-5">
            <Spinner />
            <p className="text-(--orange) font-medium text-[1.2em]">
              {item.send}
            </p>
          </div>
        </div>
      )}
      <h1 className="title mb-5 text-center">{item.title}</h1>
      <div
        id="orcamento-form"
        className="p-5 bg-(--gray) w-auto rounded-[35px] flex gap-5 flex-col"
        autoComplete="off"
      >
        <div className="flex gap-5">
          <input
            className="input"
            type="text"
            name="name"
            placeholder={item.nome}
            required
            value={formDataState.name}
            onChange={handleInputChange}
          />
          <input
            className="input"
            type="tel"
            name="phone"
            placeholder={item.phone}
            required
            value={formDataState.phone}
            onChange={handleInputChange}
          />
        </div>
        <input
          className="input"
          type="email"
          name="email"
          placeholder={item.mail}
          required
          value={formDataState.email}
          onChange={handleInputChange}
        />
        <textarea
          className="h-70 pt-5 input resize-none align-top"
          name="body"
          placeholder={item.body}
          required
          value={formDataState.body}
          onChange={handleInputChange}
        />
        {files.length < 3 && (
          <label className="bg-white shadow-sm px-5 py-2 rounded-full w-fit cursor-pointer">
            <div>
              <FiUpload className="inline mr-2" />
              {item.anexo}
            </div>
            <input
              type="file"
              name="attachment"
              className="hidden"
              multiple
              onChange={(e) => {
                setFileError("");
                const selected = Array.from(e.target.files);
                if (files.length + selected.length > 3) {
                  setFileError("Apenas é permitido até três ficheiros (imagem ou PDF).");
                  e.target.value = "";
                  return;
                }
                for (const file of selected) {
                  if (file.size > 10 * 1024 * 1024) {
                    setFileError(`O ficheiro "${file.name}" excede 10MB e não será adicionado.`);
                    e.target.value = "";
                    return;
                  }
                }
                setFiles((prev) => [...prev, ...selected]);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {fileError && (
          <div className="text-red-500 text-sm mb-2">{fileError}</div>
        )}

        <div className="flex flex-wrap gap-5">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 bg-white shadow-sm px-5 py-2 rounded-full w-fit"
            >
              <span className="text-sm max-w-[200px] truncate">
                {file.name}
              </span>
              <button
                type="button"
                className="text-(--orange) font-bold"
                onClick={() => {
                  setFiles((prev) => prev.filter((_, i) => i !== index));
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="-mt-5 bg-(--orange) text-white px-5 py-2 rounded-full shadow-md w-fit cursor-pointer self-end"
          disabled={isSubmitting}
          onClick={handleSubmit}
        >
          {item.submit}
        </button>
      </div>
    </div>
  );
}
