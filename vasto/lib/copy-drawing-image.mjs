export function copyDrawingImage(renderImage) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    return Promise.reject(new Error('Este navegador não permite copiar imagens. Abra o admin num navegador atualizado, através de HTTPS.'));
  }
  // Start the clipboard write during the click, before asynchronous rendering,
  // so browsers such as Safari can retain the user's permission to copy.
  const png = Promise.resolve().then(renderImage).then(async dataUrl => {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a imagem para copiar.');
    context.drawImage(image, 0, 0);
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Não foi possível copiar a imagem.')), 'image/png'));
  });
  // The browser may reject permission before it consumes the image promise.
  png.catch(() => {});
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}
