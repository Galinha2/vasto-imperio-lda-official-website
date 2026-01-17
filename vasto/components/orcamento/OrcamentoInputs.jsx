"use client";
import { useState, useRef } from "react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();

    // Validate file sizes before submitting
    const oversized = files.filter(
      (file) => file.size > 10 * 1024 * 1024
    ); // >10MB

    if (oversized.length > 0) {
      alert(
        `Alguns ficheiros foram ignorados porque excedem 10MB: ${oversized
          .map((f) => f.name)
          .join(", ")}`
      );
      return;
    }

    setIsSubmitting(true);

    const form = event.target;

    // Create a new DataTransfer to hold files
    const dataTransfer = new DataTransfer();
    files.forEach((file) => {
      dataTransfer.items.add(file);
    });

    // Assign files to the file input element
    if (fileInputRef.current) {
      fileInputRef.current.files = dataTransfer.files;
    }

    // Submit the form normally
    form.submit();
  }

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
      <form
        className="p-5 bg-(--gray) w-auto rounded-[35px] flex gap-5 flex-col"
        onSubmit={handleSubmit}
        action="https://formsubmit.co/geral.tecfix@gmail.com"
        method="POST"
        encType="multipart/form-data"
      >
        <input type="hidden" name="_subject" value="Novo Pedido de Orçamento" />
        <input type="hidden" name="_template" value="table" />
        <input type="hidden" name="_captcha" value="false" />
        {/* <input type="hidden" name="_next" value="https://SEU_DOMINIO_AQUI/sucesso?enviado=true" /> */}
        <input type="hidden" name="_next" value="http://localhost:3000/sucesso?enviado=true" />

        <div className="flex gap-5">
          <input
            className="input"
            type="text"
            name="name"
            placeholder={item.nome}
            required
          />
          <input
            className="input"
            type="tel"
            name="phone"
            placeholder={item.phone}
            required
          />
        </div>
        <input
          className="input"
          type="email"
          name="email"
          placeholder={item.mail}
          required
        />
        <textarea
          className="h-70 pt-5 input resize-none align-top"
          name="body"
          placeholder={item.body}
          required
        />
        {files.length < 3 && (
          <label className="bg-white shadow-sm px-5 py-2 rounded-full w-fit cursor-pointer">
            <div>
              <FiUpload className="inline mr-2" />
              {item.anexo}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              name="attachment"
              multiple
              className="hidden"
              onChange={(e) => {
                const selected = Array.from(e.target.files);
                const oversized = selected.filter(
                  (file) => file.size > 10 * 1024 * 1024
                ); // >10MB
                const validFiles = selected.filter(
                  (file) => file.size <= 10 * 1024 * 1024
                );

                if (oversized.length > 0) {
                  alert(
                    `Alguns ficheiros foram ignorados porque excedem 10MB: ${oversized
                      .map((f) => f.name)
                      .join(", ")}`
                  );
                }

                setFiles((prev) => {
                  const combinedFiles = [...prev, ...validFiles].slice(0, 3);
                  return combinedFiles;
                });

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
              <span className="text-sm max-w-[200px] truncate">
                {file.name}
              </span>
              <button
                type="button"
                className="text-(--orange) font-bold"
                onClick={() =>
                  setFiles((prev) => prev.filter((_, i) => i !== index))
                }
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
