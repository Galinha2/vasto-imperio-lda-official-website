export async function prepareChatImage(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw new Error('Escolha uma imagem JPG, PNG ou WebP com até 12 MB.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;await image.decode();
  const scale=Math.min(1,1600/image.width,1600/image.height);
  const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.8));
  if(!blob||blob.size>4*1024*1024)throw new Error('Não foi possível reduzir esta imagem. Escolha outra.');
  return blob;
 }finally{URL.revokeObjectURL(url);}
}
