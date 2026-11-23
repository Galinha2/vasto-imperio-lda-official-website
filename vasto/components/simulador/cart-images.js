// Cart entries live in localStorage (up to ten configurations), so their
// drawing must stay compact. The former 5 MB capture allowance disagreed with
// the cart validator's 350 KB ceiling and made otherwise valid admin quotes
// fail only after the drawing was generated.
export async function captureCartDrawing(drawingRef, maxImageLength = 340000) {
  const drawing = drawingRef?.current?.querySelector('svg[role="img"], svg[data-order-drawing]');
  if (!drawing) throw new Error('O desenho ainda não está disponível. Aguarde e tente novamente.');
  await document.fonts?.ready;
  const { toJpeg } = await import('html-to-image');
  const settings = maxImageLength === Infinity
    ? [{ pixelRatio: 3, quality: .96 }]
    : [{ pixelRatio: 2.2, quality: .9 }, { pixelRatio: 1.8, quality: .84 }, { pixelRatio: 1.45, quality: .78 }];
  for (const setting of settings) {
    const image = await toJpeg(drawing, { ...setting, backgroundColor: '#ffffff', cacheBust: true });
    if (image.length <= maxImageLength) return image;
  }
  throw new Error('Este desenho é demasiado detalhado para o carrinho. Reduza a configuração ou envie-a individualmente.');
}
export async function cartDrawing(entries) {
  if (!entries.length) throw new Error('O carrinho está vazio.');
  const columns = entries.length > 1 ? 2 : 1;
  const tileWidth = 1400, tileHeight = 840;
  const canvas = document.createElement('canvas');
  canvas.width = tileWidth * columns;
  canvas.height = tileHeight * Math.ceil(entries.length / columns);
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const image = new window.Image(); image.src = entry.image; await image.decode();
    const x = index % columns * tileWidth, y = Math.floor(index / columns) * tileHeight;
    context.fillStyle = '#1d1d1f'; context.font = '600 36px Arial';
    context.fillText(`${index + 1}. ${entry.label} × ${entry.quantity}`, x + 48, y + 64, tileWidth - 96);
    const scale = Math.min((tileWidth - 96) / image.naturalWidth, (tileHeight - 180) / image.naturalHeight);
    const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
    context.drawImage(image, x + (tileWidth - width) / 2, y + 120 + (tileHeight - 180 - height) / 2, width, height);
    context.strokeStyle = '#e5e5e7'; context.strokeRect(x + .5, y + .5, tileWidth - 1, tileHeight - 1);
  }
  return canvas.toDataURL('image/jpeg', .96);
}
