import test from "node:test";
import assert from "node:assert/strict";
import { quoteFilename, quoteTypeLabel } from "../lib/quote-filenames.mjs";
test("documents identify equipment, customer, date and drawing number",()=>{
 assert.equal(quoteFilename({quoteType:"picking",customerName:"João Silva",issuedAt:"2026-10-20"}),"Orçamento - Estantes Picking - João Silva - 20-10-2026.pdf");
 assert.equal(quoteFilename({quoteType:"racks",customerName:"Cliente A",issuedAt:"2026-10-20"},"Desenho","jpg",2),"Desenho - Racks para Paletes - Cliente A - 20-10-2026 - 02.jpg");
 assert.equal(quoteTypeLabel({lines:[{refCompleta:"1.2"},{refCompleta:"3.5"}]}),"Estantes Ligeiras e Estantes Picking");
 assert.equal(quoteTypeLabel({quoteDetails:"Comprimento 3.00 m"}),"Vasto Império");
 assert.ok(!quoteFilename({customerName:"Cliente/Exemplo\nTeste"}).includes("/"));
});
