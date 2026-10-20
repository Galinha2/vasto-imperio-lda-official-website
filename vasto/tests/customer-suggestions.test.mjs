import test from "node:test";
import assert from "node:assert/strict";
import { customerSuggestions } from "../lib/admin/customer-suggestions.mjs";
const sales = [
 { customerName:"Álvaro Silva", nif:"506123456", updatedAt:"2026-10-20", orderDetails:{email:"cliente@example.com"} },
 { customerName:"Álvaro Silva antigo", nif:"506123456", updatedAt:"2026-10-18", orderDetails:{moradaFiscal:"Benedita"} },
 { customerName:"Alves & Filhos", nif:"506999999", updatedAt:"2026-10-19" },
 { customerName:"Outro Cliente", nif:"509000000" },
];
test("NIF suggestions match prefix and merge duplicate customers using latest data", () => {
 const result=customerSuggestions(sales,"506","nif");
 assert.equal(result.length,2);
 assert.equal(result[0].name,"Álvaro Silva");
 assert.equal(result[0].address,"Benedita");
 assert.equal(result[0].email,"cliente@example.com");
 assert.equal(customerSuggestions(sales,"123","nif").length,0);
});
test("name suggestions ignore case and accents and require a prefix", () => {
 assert.equal(customerSuggestions(sales,"alv").length,2);
 assert.equal(customerSuggestions(sales,"ÁLVARO")[0].nif,"506123456");
 assert.equal(customerSuggestions(sales,"silva").length,0);
 assert.equal(customerSuggestions(sales,"").length,0);
 assert.equal(customerSuggestions(sales,"a").length,0);
});
test("suggestions stay bounded and records without a NIF can still be found by name", () => {
 assert.equal(customerSuggestions([{customerName:"Manuel",nif:""}],"man")[0].name,"Manuel");
 const many=Array.from({length:20},(_,i)=>({customerName:`Empresa ${i}`,nif:String(506000000+i)}));
 assert.equal(customerSuggestions(many,"506","nif").length,8);
});
