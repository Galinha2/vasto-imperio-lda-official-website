import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { jsPDF } = require('jspdf');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'docs', 'Porteco-MI-Vasto-Imperio.pdf');
const logo = `data:image/png;base64,${(await readFile(path.join(root, 'public', 'logo.png'))).toString('base64')}`;
const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });

const palette = { blue: '#0879c0', orange: '#ff5500', ink: '#1d1d1f', slate: '#62666d', line: '#dfe5ea', mist: '#f5f8fa', white: '#ffffff' };
const heights = ['2000', '2500', '3000', '3500', '4000', '4500', '5000'];
const depthRows = [['400', '360', '905'], ['500', '460', '946'], ['600', '560', '996'], ['800', '760', '1118'], ['1000', '960', '1260'], ['1200', '1160', '1417']];
const verticalRows = [['A', '2', '2', '2', '2', '2', '2', '2'], ['B', '2', '2', '2', '2', '2', '2', '2'], ['C', '4', '4', '4', '4', '4', '4', '4'], ['D', '2', '3', '3', '3', '3', '2', '3'], ['E', '8', '10', '12', '12', '14', '14', '16'], ['F', '2', '2', '3', '3', '4', '5', '5']];
const lengthRows = [['G', '2', '2', '2'], ['H', '4', '4', '4'], ['I', '1', '2', '3'], ['J', '2', '2', '2'], ['K', '2', '4', '6'], ['L', '2', '3', '4']];

function color(value) { doc.setTextColor(value); }
function line(value) { doc.setDrawColor(value); }
function fill(value) { doc.setFillColor(value); }
function text(value, x, y, size = 3.5, options = {}) { doc.setFont('helvetica', options.bold ? 'bold' : 'normal'); doc.setFontSize(size); color(options.color || palette.ink); doc.text(String(value), x, y, options); }
function rounded(x, y, w, h, radius = 3, colorFill = palette.white, colorLine = palette.line) { fill(colorFill); line(colorLine); doc.roundedRect(x, y, w, h, radius, radius, 'FD'); }

function header(page, kicker, title, description) {
  fill(palette.white); doc.rect(0, 0, 297, 210, 'F');
  doc.addImage(logo, 'PNG', 18, 13, 37, 10);
  text('DOCUMENTO TÉCNICO', 18, 31, 2.8, { bold: true, color: palette.blue });
  text(title, 18, 41, 10.5, { bold: true });
  text(description, 18, 47, 3.5, { color: palette.slate });
  fill(palette.orange); doc.roundedRect(18, 52, 20, 1.8, .9, .9, 'F');
  text(kicker, 42, 53.4, 2.8, { bold: true, color: palette.slate });
  line(palette.line); doc.line(18, 59, 279, 59);
  footer(page);
}

function footer(page) {
  line(palette.line); doc.line(18, 195, 279, 195);
  text('VASTO IMPÉRIO, LDA · VISEU E BENEDITA · vastoimperio.pt', 18, 201, 2.5, { color: palette.slate });
  text(`PORTECO MI · ${String(page).padStart(2, '0')}`, 279, 201, 2.5, { color: palette.slate, align: 'right' });
}

function sectionTitle(index, title, x, y) {
  fill(palette.blue); doc.circle(x + 2.4, y - .8, 2.4, 'F');
  text(index, x + 2.4, y + .15, 2.4, { bold: true, color: palette.white, align: 'center' });
  text(title, x + 7, y, 4.1, { bold: true });
}

function simpleTable(x, y, columns, rows, widths, options = {}) {
  const rowHeight = options.rowHeight || 6.4;
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  rounded(x, y, totalWidth, rowHeight * (rows.length + 1), 2.6, palette.white, palette.line);
  fill(palette.mist); doc.roundedRect(x, y, totalWidth, rowHeight, 2.6, 2.6, 'F');
  let cursor = x;
  columns.forEach((column, index) => {
    text(column, cursor + widths[index] / 2, y + 4.1, 2.8, { bold: true, color: palette.slate, align: 'center' });
    cursor += widths[index];
  });
  rows.forEach((row, rowIndex) => {
    const top = y + rowHeight * (rowIndex + 1);
    if (rowIndex > 0) { line(palette.line); doc.line(x, top, x + totalWidth, top); }
    let cell = x;
    row.forEach((value, columnIndex) => {
      const emphasise = columnIndex === 0;
      text(value, cell + widths[columnIndex] / 2, top + 4.05, 3, { bold: emphasise, color: emphasise ? palette.blue : palette.ink, align: 'center' });
      cell += widths[columnIndex];
    });
  });
}

function rackDiagram(x, y, width, height, levels = 3, title = 'Estrutura de referência') {
  rounded(x, y, width, height, 4, palette.mist, palette.line);
  const left = x + 13, right = x + width - 13, top = y + 15, bottom = y + height - 14;
  fill(palette.white); doc.roundedRect(x + 6, y + 6, width - 12, height - 12, 3, 3, 'F');
  line(palette.blue); doc.setLineWidth(1.6); doc.line(left, top, left, bottom); doc.line(right, top, right, bottom);
  doc.setLineWidth(.65); line(palette.orange);
  for (let level = 0; level < levels; level += 1) {
    const ly = top + (bottom - top) * (level + .4) / levels;
    doc.line(left, ly, right, ly);
  }
  line('#99a8b5'); doc.setLineWidth(.45); doc.line(left + 1.2, top + 4, right - 1.2, bottom - 4); doc.line(left + 1.2, bottom - 4, right - 1.2, top + 4);
  text(title, x + 8, y + height - 5.5, 2.9, { bold: true, color: palette.slate });
}

header(1, 'PORTECO MI · ESTRUTURA VERTICAL', 'Configuração, profundidade e travamentos', 'Guia de composição para uma instalação clara, segura e consistente. Todas as dimensões estão em milímetros.');
sectionTitle('01', 'Estrutura vertical', 18, 69);
rackDiagram(18, 75, 78, 72, 3, 'Vista frontal · níveis ajustáveis');
text('Alturas disponíveis', 104, 78, 3.2, { bold: true, color: palette.slate });
heights.forEach((height, index) => {
  const cx = 107 + (index % 4) * 40;
  const cy = 85 + Math.floor(index / 4) * 17;
  rounded(cx, cy, 34, 11, 2.8, index === 0 ? '#e9f4fb' : palette.white, index === 0 ? '#b6d9ef' : palette.line);
  text(height, cx + 17, cy + 5.1, 4.1, { bold: true, color: index === 0 ? palette.blue : palette.ink, align: 'center' });
  text('mm', cx + 17, cy + 8.2, 2.5, { color: palette.slate, align: 'center' });
});
text('Conjunto vertical · quantidade por altura', 104, 121, 3.2, { bold: true, color: palette.slate });
simpleTable(104, 126, ['Ref.', ...heights.map((value) => `${value}`)], verticalRows, [15, 20, 20, 20, 20, 20, 20, 20], { rowHeight: 6.2 });
sectionTitle('02', 'Profundidade e diagonais', 18, 158);
simpleTable(18, 164, ['Profundidade', 'Horizontal', 'Diagonal'], depthRows, [38, 35, 35], { rowHeight: 5.2 });
text('Todas as medidas são indicativas para a configuração Porteco MI e devem ser confirmadas antes da instalação.', 138, 178, 3.1, { color: palette.slate });
text('A · B · C · D · E · F identificam os elementos no esquema técnico original.', 138, 185, 3.1, { color: palette.slate });

doc.addPage('a4', 'landscape');
header(2, 'PORTECO MI · ESTRUTURA HORIZONTAL', 'Comprimento e composição do módulo', 'Referência rápida de quantidades por vão. Utilize esta página em conjunto com a configuração vertical.');
sectionTitle('03', 'Estrutura horizontal', 18, 69);
rackDiagram(18, 75, 116, 75, 2, 'Vista em planta · módulos e diagonais');
line(palette.blue); doc.setLineWidth(.8); doc.line(37, 111, 115, 111); doc.setLineWidth(.35); line(palette.slate); doc.line(37, 108.5, 37, 113.5); doc.line(115, 108.5, 115, 113.5);
text('Comprimento útil do módulo', 76, 118, 2.8, { color: palette.slate, align: 'center' });
sectionTitle('04', 'Quantidades por comprimento', 146, 69);
simpleTable(146, 75, ['Ref.', '1500–2000 mm', '2250–2600 mm', '2750 mm'], lengthRows, [20, 37, 37, 37], { rowHeight: 8.2 });
rounded(146, 136, 131, 30, 4, '#eef7fc', '#c7e2f1');
text('Nota de instalação', 154, 146, 3.6, { bold: true, color: palette.blue });
text('As quantidades indicadas correspondem aos elementos G–L por módulo horizontal.', 154, 153, 3.1, { color: palette.ink });
text('Confirme a altura, profundidade e comprimento final antes de encomendar ou montar.', 154, 159, 3.1, { color: palette.ink });
sectionTitle('05', 'Legenda técnica', 18, 166);
const legend = [['G', 'Elementos horizontais'], ['H', 'Travamentos do módulo'], ['I', 'Componentes por comprimento'], ['J', 'Fixações de união'], ['K', 'Conjunto de diagonais'], ['L', 'Pontos de ligação']];
legend.forEach(([letter, description], index) => {
  const x = 18 + (index % 3) * 88, y = 173 + Math.floor(index / 3) * 11;
  fill(palette.blue); doc.roundedRect(x, y, 8, 7, 2, 2, 'F'); text(letter, x + 4, y + 4.8, 3, { bold: true, color: palette.white, align: 'center' });
  text(description, x + 11, y + 4.5, 3, { color: palette.slate });
});

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, Buffer.from(doc.output('arraybuffer')));
console.log(output);
