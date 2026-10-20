import test from "node:test";
import assert from "node:assert/strict";
import { attachmentType, validateAttachment } from "../lib/email/attachments.mjs";
test("additional attachments retain their names and use verified file formats", () => {
  assert.equal(validateAttachment("planta.PDF", Buffer.from("%PDF-test")).contentType, "application/pdf");
  assert.equal(validateAttachment("../foto.jpg", Buffer.from([255,216,255])).filename, "foto.jpg");
  assert.equal(validateAttachment("notas.txt", Buffer.from("Notas")).contentType, "text/plain");
  assert.equal(attachmentType("medidas.xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
});
test("rejects executables, empty attachments and fake image extensions", () => {
  assert.throws(() => validateAttachment("programa.exe", Buffer.from("MZ")), { status:400 });
  assert.throws(() => validateAttachment("foto.png", Buffer.from("fake")), { status:400 });
  assert.throws(() => validateAttachment("folha.docx", Buffer.from("fake")), { status:400 });
  assert.throws(() => validateAttachment("notas.txt", Buffer.alloc(0)), { status:400 });
});
