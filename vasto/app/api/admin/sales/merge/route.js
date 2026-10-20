import { NextResponse } from "next/server";
import { assertSession, assertOrigin } from "@/lib/admin/auth.mjs";
import { getPdf, mergeSaleQuotes, separateMergedSale } from "@/lib/admin/store.mjs";
import { editableQuote } from "@/lib/admin/editable-quote.mjs";
import { assertMergeable, combinedQuoteLines } from "@/lib/admin/merge-quotes.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const failure=(error)=>NextResponse.json({error:error.status?error.message:"Não foi possível juntar/separar os orçamentos."},{status:error.status||500});
export async function GET(request) {
  try {
    assertSession(request);
    const url=new URL(request.url);
    const source=await getPdf(url.searchParams.get("sourceId")), target=await getPdf(url.searchParams.get("targetId"));
    assertMergeable(source.record,target.record);
    const quotes=await Promise.all([target,source].map(async({record,buffer})=>({record,...await editableQuote(record,buffer)})));
    const lines=combinedQuoteLines(quotes);
    return NextResponse.json({lines,customer:target.record,expected:{source:source.record.updatedAt,target:target.record.updatedAt},sources:quotes.map(({record})=>({id:record.id,customerName:record.customerName,images:record.images||[],details:record.quoteDetails||record.orderDetails?.detalhes||"",subtotal:record.subtotal}))},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return failure(error);}
}
export async function POST(request) {
  try {
    assertSession(request);assertOrigin(request);
    const form=await request.formData();const pdf=form.get("pdf"), image=form.get("image");
    if(!pdf||typeof pdf.arrayBuffer!=="function"||pdf.size>3.7*1024*1024||(image?.size||0)+pdf.size>3.7*1024*1024) return NextResponse.json({error:"Os ficheiros da junção ultrapassam 3,7 MB."},{status:400});
    const sales=await mergeSaleQuotes(String(form.get("sourceId")),String(form.get("targetId")),JSON.parse(String(form.get("expected"))),Buffer.from(await pdf.arrayBuffer()),image?Buffer.from(await image.arrayBuffer()):null);
    return NextResponse.json({sales});
  }catch(error){return failure(error);}
}
export async function DELETE(request) {
  try {assertSession(request);assertOrigin(request);const {id}=await request.json();return NextResponse.json({sales:await separateMergedSale(id)});}catch(error){return failure(error);}
}
