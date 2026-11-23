import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { jsPDF } = require('jspdf');
const sharp = (await import('sharp')).default;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = '/tmp/porteco-vasto-pages';
const logo = `data:image/png;base64,${(await readFile(path.join(root, 'public', 'logo.png'))).toString('base64')}`;

// The source pages are technical black-and-white sheets.  Tint their neutral
// ink into the Vasto blue scale while preserving every diagram and dimension.
async function siteStyledPage(name) {
  const source = await readFile(path.join(temp, name));
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const brandBlue = [3, 89, 150];
  for (let i = 0; i < data.length; i += info.channels) {
    const red = data[i], green = data[i + 1], blue = data[i + 2];
    const neutral = Math.max(red, green, blue) - Math.min(red, green, blue) < 15;
    if (!neutral) continue;
    const luminance = (red + green + blue) / 3;
    const ink = Math.pow((255 - luminance) / 255, .86);
    data[i] = Math.round(255 - ((255 - brandBlue[0]) * ink));
    data[i + 1] = Math.round(255 - ((255 - brandBlue[1]) * ink));
    data[i + 2] = Math.round(255 - ((255 - brandBlue[2]) * ink));
  }
  const output = await sharp(data, { raw: info }).png().toBuffer();
  return `data:image/png;base64,${output.toString('base64')}`;
}

const page1 = await siteStyledPage('porteco-page-1.png');
const page2 = await siteStyledPage('porteco-page-2.png');
const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
const width = 210, height = 297;
const blue = '#0879c0';
const orange = '#ff5500';

function cover(x, y, w, h) { doc.setFillColor('#ffffff'); doc.rect(x, y, w, h, 'F'); }
function logoAt(x, y, w, h) { doc.addImage(logo, 'PNG', x, y, w, h); }

doc.addImage(page1, 'PNG', 0, 0, width, height);
doc.setFillColor(blue); doc.roundedRect(5, 3, 32, 1.5, .75, .75, 'F');
doc.setFillColor(orange); doc.roundedRect(5, 3, 10, 1.5, .75, .75, 'F');
doc.addPage('a4', 'portrait');
doc.addImage(page2, 'PNG', 0, 0, width, height);
doc.setFillColor(blue); doc.roundedRect(5, 3, 32, 1.5, .75, .75, 'F');
doc.setFillColor(orange); doc.roundedRect(5, 3, 10, 1.5, .75, .75, 'F');
// Original supplier logo and vertical footer, expressed in source-page points.
cover(5, 255, 80, 42); cover(194.5, 205, 15.5, 92);
// 762 × 572: retain the source logo's exact aspect ratio.
logoAt(10, 260, 34, 25.5);
doc.setFont('helvetica', 'bold'); doc.setFontSize(5.3); doc.setTextColor(blue); doc.text('VASTO IMPÉRIO · SOLUÇÕES DE ARMAZENAGEM', 10, 290);
doc.setFillColor(orange); doc.roundedRect(10, 293, 18, 1.6, .8, .8, 'F');

await writeFile(path.join(root, 'docs', 'Porteco-MI-Vasto-Imperio.pdf'), Buffer.from(doc.output('arraybuffer')));
