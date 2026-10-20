"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import generateBudgetPdf from "@/lib/generateBudgetPdf";

async function combineDrawings(sources) {
  const images = await Promise.all(sources.flatMap((source) => source.images.map(async (image) => {
    const response = await fetch(`/api/admin/sales/${source.id}/images/${image.id}`, { cache:"no-store" });
    if (!response.ok) throw new Error("Não foi possível recuperar um dos desenhos. A junção não foi guardada.");
    const url = URL.createObjectURL(await response.blob());
    const picture = new Image();
    try { picture.src=url; await picture.decode(); return picture; } finally { URL.revokeObjectURL(url); }
  })));
  if (!images.length) return null;
  const width=1400, gap=32;
  const heights=images.map((image)=>image.naturalHeight*width/image.naturalWidth);
  const total=heights.reduce((sum,height)=>sum+height+gap,0)+gap;
  const ratio=Math.min(1,12000/total);
  const canvas=document.createElement("canvas");canvas.width=Math.round(width*ratio);canvas.height=Math.round(total*ratio);
  const context=canvas.getContext("2d");context.fillStyle="#fff";context.fillRect(0,0,canvas.width,canvas.height);
  let y=gap;
  images.forEach((image,index)=>{context.drawImage(image,0,y*ratio,canvas.width,heights[index]*ratio);y+=heights[index]+gap;});
  return new Promise((resolve,reject)=>canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error("Não foi possível juntar os desenhos.")),"image/jpeg",0.87));
}

export default function QuoteCombinationDialog({ sourceId, targetId, separateId, onClose, onVersions, onSaved }) {
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function combine() {
    setBusy(true);setError("");
    try {
      let response;
      if(separateId) response=await fetch("/api/admin/sales/merge",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:separateId})});
      else {
        const preparation=await fetch(`/api/admin/sales/merge?sourceId=${sourceId}&targetId=${targetId}`,{cache:"no-store"});
        const data=await preparation.json();if(!preparation.ok)throw new Error(data.error);
        const details=data.sources.map((source,index)=>`Configuração ${index+1}: ${source.details||"Orçamento original"}`).join("\n");
        const [pdf,image]=await Promise.all([
          generateBudgetPdf({linhas:data.lines,descontoSelecionado:0,dadosEmpresa:{nome:data.customer.customerName,nif:data.customer.nif,codigoPostal:data.customer.orderDetails?.moradaFiscal||""},nif:data.customer.nif,nomeClienteManual:data.customer.customerName,additionalDetails:`Orçamento conjunto. Os preços já incluem os descontos dos documentos originais.\n${details}`,returnBlob:true}),
          combineDrawings(data.sources),
        ]);
        if(pdf.size+(image?.size||0)>3.7*1024*1024)throw new Error("Os desenhos juntos ultrapassam o limite de envio. Reduza o tamanho das imagens antes de juntar.");
        const payload=new FormData();payload.append("sourceId",sourceId);payload.append("targetId",targetId);payload.append("expected",JSON.stringify(data.expected));payload.append("pdf",pdf,"orcamento-conjunto.pdf");if(image)payload.append("image",image,"desenhos-conjuntos.jpg");
        response=await fetch("/api/admin/sales/merge",{method:"POST",body:payload});
      }
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Não foi possível concluir.");
      onSaved(result.sales,!!separateId);onClose();window.dispatchEvent(new Event("admin:sales-changed"));
    }catch(failure){setError(failure.message);}finally{setBusy(false);}
  }
  return createPortal(<div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-label="Organizar orçamentos" className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-xl">
    <h2 className="text-xl font-semibold tracking-tight">{separateId?"Separar orçamento conjunto?":"Como quer juntar estes orçamentos?"}</h2>
    {separateId?<p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">Os dois documentos originais voltam às vendas, com os respetivos desenhos e valores. As alterações feitas apenas no orçamento conjunto não passam para os originais.</p>:<div className="mt-5 space-y-3">
      <button type="button" disabled={busy} onClick={()=>{onVersions(sourceId,targetId);onClose();}} className="w-full cursor-pointer rounded-2xl border border-[#e5e5e7] p-4 text-left hover:bg-[#f5f5f7] disabled:opacity-50"><span className="block text-sm font-semibold">Agrupar como versões</span><span className="mt-1 block text-xs leading-relaxed text-[#86868b]">Alternativas do mesmo pedido. Mantém os PDFs separados e mostra o número de versões.</span></button>
      <button type="button" disabled={busy} onClick={combine} className="w-full cursor-pointer rounded-2xl border border-orange-200 bg-orange-50 p-4 text-left hover:bg-orange-100 disabled:opacity-50"><span className="block text-sm font-semibold text-orange-700">Juntar num único orçamento</span><span className="mt-1 block text-xs leading-relaxed text-[#6e6e73]">Soma os artigos e os valores, conserva os descontos e junta os desenhos numa imagem vertical. Pode voltar a separar em Ações.</span></button>
    </div>}
    {error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={busy} onClick={onClose} className="cursor-pointer rounded-full px-4 py-2 text-sm text-[#6e6e73]">Cancelar</button>{separateId&&<button type="button" disabled={busy} onClick={combine} className="cursor-pointer rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white">Separar</button>}</div>
    {busy&&<p role="status" className="mt-3 text-xs text-[#86868b]">{separateId?"A recuperar os originais…":"A preparar o PDF e a juntar os desenhos…"}</p>}
  </section></div>,document.body);
}
