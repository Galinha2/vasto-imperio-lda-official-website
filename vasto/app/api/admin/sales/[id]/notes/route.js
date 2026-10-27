import { NextResponse } from 'next/server';
import { assertOrigin, assertSession } from '@/lib/admin/auth.mjs';
import { getSale, getCustomerNotes, updateCustomerNotes } from '@/lib/admin/store.mjs';
import { sameNotesCustomer } from '@/lib/admin/customer-notes.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const failure = (error) => NextResponse.json({ error: error.status ? error.message : 'Não foi possível guardar ou consultar as notas.' }, { status: error.status || 500 });
export async function GET(request, { params }) {
  try { assertSession(request); return NextResponse.json(await getCustomerNotes((await params).id), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return failure(error); }
}
async function mutate(request, context, action) {
  try {
    assertSession(request); assertOrigin(request);
    if (Number(request.headers.get('content-length')) > 24000) return NextResponse.json({ error: 'Nota demasiado grande.' }, { status: 413 });
    const id = (await context.params).id;
    const removing = action !== "add";
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Nota inválida." }, { status: 400 }); }
    if (!body || typeof body !== "object" || (removing && !body.noteId)) return NextResponse.json({ error: "Nota inválida." }, { status: 400 });
    const ownerId = removing ? String(body.saleId || '') : id;
    if (removing && ownerId !== id) {
      const [client, owner] = await Promise.all([getSale(id), getSale(ownerId)]);
      if (!client || !owner || !sameNotesCustomer(client, owner)) return NextResponse.json({ error: 'Nota não encontrada para este cliente.' }, { status: 404 });
    }
    const updatedSale = await updateCustomerNotes(ownerId, body, body.updatedAt, action === "delete" ? String(body.noteId || '') : '', action === "complete" ? String(body.noteId || '') : '');
    return NextResponse.json({ ...await getCustomerNotes(id), updatedSale }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
export const POST = (request, context) => mutate(request, context, "add");
export const DELETE = (request, context) => mutate(request, context, "delete");

export const PATCH = (request, context) => mutate(request, context, "complete");
