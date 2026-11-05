export async function captureCartDrawing(drawingRef) {
  const drawing = drawingRef?.current?.querySelector('svg[role="img"], svg[data-order-drawing]');
  if (!drawing) throw new Error('O desenho ainda não está disponível. Aguarde e tente novamente.');
  await document.fonts?.ready;
  const { toJpeg } = await import('html-to-image');
  const image = await toJpeg(drawing, { pixelRatio: 1, quality: .8, backgroundColor: '#ffffff', cacheBust: true });
  if (image.length > 350000) throw new Error('Este desenho é demasiado grande para o carrinho. Reduza a configuração ou envie-a individualmente.');
  return image;
}
export async function cartDrawing(entries) {
  if (!entries.length) throw new Error('O carrinho está vazio.');
  const columns = entries.length > 1 ? 2 : 1;
  const tileWidth = 700, tileHeight = 420;
  const canvas = document.createElement('canvas');
  canvas.width = tileWidth * columns;
  canvas.height = tileHeight * Math.ceil(entries.length / columns);
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const image = new window.Image(); image.src = entry.image; await image.decode();
    const x = index % columns * tileWidth, y = Math.floor(index / columns) * tileHeight;
    context.fillStyle = '#1d1d1f'; context.font = '600 18px Arial';
    context.fillText(`${index + 1}. ${entry.label} × ${entry.quantity}`, x + 24, y + 32, tileWidth - 48);
    const scale = Math.min((tileWidth - 48) / image.naturalWidth, (tileHeight - 90) / image.naturalHeight);
    const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
    context.drawImage(image, x + (tileWidth - width) / 2, y + 60 + (tileHeight - 90 - height) / 2, width, height);
    context.strokeStyle = '#e5e5e7'; context.strokeRect(x + .5, y + .5, tileWidth - 1, tileHeight - 1);
  }
  return canvas.toDataURL('image/jpeg', .88);
}
