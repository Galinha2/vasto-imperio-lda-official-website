const types = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain", csv: "text/csv", zip: "application/zip",
};
export const attachmentAccept = Object.keys(types).map((extension) => `.${extension}`).join(",");
export function attachmentType(name) { return types[String(name).split(".").pop().toLowerCase()] || null; }
export function validateAttachment(name, content) {
  const type = attachmentType(name);
  if (!type || !content.length) throw Object.assign(new Error("Escolha um ficheiro PDF, imagem JPG/PNG/WebP, Word, Excel, TXT, CSV ou ZIP não vazio."), { status: 400 });
  const head = content.subarray(0, 12);
  const matches = type === "application/pdf" ? head.subarray(0, 5).toString() === "%PDF-"
    : type === "image/jpeg" ? head[0] === 255 && head[1] === 216 && head[2] === 255
    : type === "image/png" ? head.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : type === "image/webp" ? head.subarray(0, 4).toString() === "RIFF" && head.subarray(8, 12).toString() === "WEBP"
    : /wordprocessingml|spreadsheetml|application\/zip/.test(type) ? head[0] === 80 && head[1] === 75
    : /msword|ms-excel/.test(type) ? head.subarray(0, 8).equals(Buffer.from([208,207,17,224,161,177,26,225])) : true;
  if (!matches) throw Object.assign(new Error(`O conteúdo do ficheiro ${name} não corresponde ao seu formato.`), { status: 400 });
  return { filename: String(name).replace(/^.*[\\/]/, "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 180), content, contentType: type };
}
