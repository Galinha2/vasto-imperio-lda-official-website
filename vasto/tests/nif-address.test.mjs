import assert from "node:assert/strict";
import test from "node:test";
import { addressFromRaciusHtml, postalAddressFromNifHtml, raciusUrlFromNifHtml } from "../lib/nif-address.mjs";

test("reads the postal locality published by nif.pt", () => {
  const html = "<div class='detail'><h1>500 960 046</h1><br/>1000-300 Lisboa<br/></div>";
  assert.equal(postalAddressFromNifHtml(html), "1000-300 Lisboa");
});

test("uses the complete public address from Racius structured data", () => {
  const html = `<script type="application/ld+json">{"address":{"streetAddress":"Avenida João XXI, Nº 63","postalCode":"1000-300","addressLocality":"Lisboa"}}</script>`;
  assert.equal(addressFromRaciusHtml(html), "Avenida João XXI, Nº 63 1000-300 Lisboa");
});

test("only accepts a Racius link obtained from the NIF page", () => {
  assert.equal(raciusUrlFromNifHtml("<a class='link-racius' href='https://www.racius.com/empresa/'>Dados</a>"), "https://www.racius.com/empresa/");
  assert.equal(raciusUrlFromNifHtml("<a class='link-racius' href='https://example.com/'>Dados</a>"), "");
});
