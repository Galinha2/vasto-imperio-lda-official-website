import test from "node:test";
import assert from "node:assert/strict";
import { hasCustomerName, resolveCustomerName } from "../lib/customer-identity.mjs";
test("personal NIF lookup placeholders do not overwrite the name typed by the admin", () => {
 for (const nome of ["Cliente", " Ciente ", " CLIENTE ", "NIF não encontrado", "", undefined]) assert.equal(resolveCustomerName({nome}," João Silva "),"João Silva");
 assert.equal(resolveCustomerName(null,"Maria Silva"),"Maria Silva");
 assert.equal(resolveCustomerName({nome:"Empresa Lda"},"Outro"),"Empresa Lda");
 assert.equal(resolveCustomerName({nome:"Cliente"},""),"Cliente");
 assert.equal(hasCustomerName("NIF não encontrado"),false);
});
