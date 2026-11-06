import sharp from 'sharp';
export async function optimizeImage(buffer, {chat = false} = {}) {
  try {
    const image = sharp(buffer, {limitInputPixels: 40000000, animated: false, failOn: 'error'});
    const metadata = await image.metadata();
    if (!['jpeg','png','webp'].includes(metadata.format)) throw new Error('format');
    const output = await image.rotate().resize({width:chat?1600:2560,height:chat?1600:2560,fit:'inside',withoutEnlargement:true}).webp({quality:chat?78:88,effort:6,smartSubsample:true}).toBuffer();
    // Keep an already smaller source for permanent drawings; chat uses a single format.
    if (!chat && output.length >= buffer.length) return {buffer, contentType:`image/${metadata.format === 'jpeg'?'jpeg':metadata.format}`};
    return {buffer:output,contentType:'image/webp'};
  } catch {throw Object.assign(new Error('Escolha uma imagem JPG, PNG ou WebP válida (até 40 megapíxeis).'),{status:400});}
}
