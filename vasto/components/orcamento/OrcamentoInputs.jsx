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
  const [formError, setFormError] = useState("");
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
    // Validação de campos obrigatórios
    const { name, phone, email, body } = formDataState;
    if (!name.trim() || !email.trim() || !body.trim()) {
      setFormError("Por favor, preencha todos os campos obrigatórios: Nome, Email e Mensagem.");
      return;
    } else {
      setFormError("");
    }

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
      files.forEach((file) => {
        // Todos os ficheiros enviados com o mesmo nome 'attachment'
        formData.append("attachment", file);
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
    <div className="relative mx-auto flex w-full max-w-[1120px] flex-col items-center px-5 pb-16 pt-[96px] sm:px-8 sm:pb-20 sm:pt-[112px] lg:pb-24 lg:pt-[128px]">
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/75 backdrop-blur-sm">
          <div className="site-glass flex flex-col items-center justify-center gap-5 rounded-[28px] border border-[#e5e5e7] bg-white px-10 py-8 shadow-xl">
            <Spinner />
            <p className="text-base font-semibold text-[#1d1d1f]">{item.send}</p>
          </div>
        </div>
      )}
      <header className="mx-auto mb-9 max-w-3xl text-center sm:mb-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--orange)">{language === "pt" ? "Orçamento gratuito · Sem compromisso" : "Free quote · No obligation"}</p>
        <h1 className="mt-5 text-4xl font-semibold leading-[1.04] tracking-[-0.055em] text-[#1d1d1f] sm:text-5xl lg:text-6xl">{item.title}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#6e6e73] sm:text-lg">
          {language === "pt" ? "Conte-nos o que precisa. A nossa equipa ajuda a encontrar a solução certa para o seu espaço." : "Tell us what you need. Our team will help you find the right solution for your space."}
        </p>
      </header>
      <div
        id="orcamento-form"
        className="flex w-full max-w-[960px] flex-col gap-5 sm:gap-6"
        autoComplete="off"
      >
        <div className="mb-1 pb-1">
          <h2 className="text-xl font-semibold tracking-[-0.035em] text-[#1d1d1f]">{language === "pt" ? "Conte-nos o que procura" : "Tell us what you need"}</h2>
          <p className="mt-1.5 text-sm leading-6 text-[#6e6e73]">{language === "pt" ? "Preencha os seus dados e descreva o projeto." : "Add your contact details and describe your project."}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          <input
            className="input border border-[#e5e5e7] bg-white px-5 py-4 text-base text-[#1d1d1f] shadow-sm outline-none transition placeholder:text-[#929299] focus:border-(--blue) focus:ring-4 focus:ring-[#0879c0]/10"
            type="text"
            name="name"
            placeholder={item.nome}
            required
            value={formDataState.name}
            onChange={handleInputChange}
          />
          <input
            className="input border border-[#e5e5e7] bg-white px-5 py-4 text-base text-[#1d1d1f] shadow-sm outline-none transition placeholder:text-[#929299] focus:border-(--blue) focus:ring-4 focus:ring-[#0879c0]/10"
            type="tel"
            name="phone"
            placeholder={item.phone}
            required
            value={formDataState.phone}
            onChange={handleInputChange}
          />
        </div>
        <input
          className="input border border-[#e5e5e7] bg-white px-5 py-4 text-base text-[#1d1d1f] shadow-sm outline-none transition placeholder:text-[#929299] focus:border-(--blue) focus:ring-4 focus:ring-[#0879c0]/10"
          type="email"
          name="email"
          placeholder={item.mail}
          required
          value={formDataState.email}
          onChange={handleInputChange}
        />
        <textarea
          className="input min-h-[190px] resize-y border border-[#e5e5e7] bg-white px-5 py-4 text-base text-[#1d1d1f] shadow-sm outline-none transition placeholder:text-[#929299] focus:border-(--blue) focus:ring-4 focus:ring-[#0879c0]/10"
          name="body"
          placeholder={item.body}
          required
          value={formDataState.body}
          onChange={handleInputChange}
        />
        {files.length < 3 && (
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-5 py-3 text-sm font-semibold text-[#424245] transition hover:bg-[#eceef2]">
            <div className="flex items-center gap-2">
              <FiUpload aria-hidden="true" />
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
          <div role="alert" className="mb-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{fileError}</div>
        )}

        {formError && (
          <div role="alert" className="mb-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</div>
        )}

        <div className="flex flex-wrap gap-5">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex w-fit items-center gap-3 rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-4 py-2.5"
            >
              <span className="text-sm max-w-[200px] truncate">
                {file.name}
              </span>
              <button
                type="button"
                aria-label={`Remover ${file.name}`}
                className="cursor-pointer rounded-full p-1 text-(--orange) transition hover:bg-white"
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
          className="mt-1 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-(--orange) px-7 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(255,85,0,0.2)] transition hover:-translate-y-0.5 hover:bg-(--orange-hover) disabled:cursor-wait disabled:opacity-60 sm:w-fit sm:self-end"
          disabled={isSubmitting}
          onClick={handleSubmit}
        >
          {item.submit}
        </button>
      </div>
    </div>
  );
}
