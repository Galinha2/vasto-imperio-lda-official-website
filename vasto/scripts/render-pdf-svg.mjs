import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';

class SvgNode {
  constructor(name, text = '') { this.nodeName = name; this.textContent = text; this.attributes = new Map(); this.childNodes = []; this.style = {}; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  setAttributeNS(_space, name, value) { this.setAttribute(name, value); }
  appendChild(child) { this.childNodes.push(child); return child; }
  append(...children) { children.forEach((child) => this.appendChild(child)); }
  cloneNode(deep = false) { const copy = new SvgNode(this.nodeName, this.textContent); copy.attributes = new Map(this.attributes); copy.style = { ...this.style }; if (deep) copy.childNodes = this.childNodes.map((child) => child.cloneNode(true)); return copy; }
  get firstChild() { return this.childNodes[0] || null; }
  removeChild(child) { this.childNodes = this.childNodes.filter((item) => item !== child); }
}
globalThis.document = { createElementNS: (_space, name) => new SvgNode(name), createTextNode: (text) => new SvgNode('#text', text) };
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function serialize(node) {
  if (node.nodeName === '#text') return escape(node.textContent);
  const namespace = node.nodeName === 'svg:svg' ? ' xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"' : '';
  const attrs = namespace + [...node.attributes.entries()].map(([key, value]) => ` ${key}="${escape(value)}"`).join('');
  const children = node.childNodes.map(serialize).join('');
  return `<${node.nodeName}${attrs}>${node.textContent ? escape(node.textContent) : ''}${children}</${node.nodeName}>`;
}

const [input, output, requestedPage = '1'] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: node render-pdf-svg.mjs input.pdf output.svg [page]');
const require = createRequire(import.meta.url);
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const data = new Uint8Array(await readFile(input));
const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
const page = await pdf.getPage(Number(requestedPage));
const viewport = page.getViewport({ scale: 2 });
const svg = await new pdfjs.SVGGraphics(page.commonObjs, page.objs).getSVG(await page.getOperatorList(), viewport);
await writeFile(output, serialize(svg));
