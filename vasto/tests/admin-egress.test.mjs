import test from 'node:test';
import assert from 'node:assert/strict';
import { listSales, saleNotifications } from '../lib/admin/store.mjs';
import { dueFollowUps } from '../lib/admin/follow-ups.mjs';
import { customerSuggestions } from '../lib/admin/customer-suggestions.mjs';
import { salePeriodDate } from '../lib/admin/sale-period.mjs';

test('report projections retain financial and historical dates without downloading quote lines or notes', async () => {
  const original={...process.env}, originalFetch=globalThis.fetch;
  process.env.SUPABASE_URL='https://example.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
  const record={id:'a'.repeat(64),customerName:'Empresa',issuedAt:'2026-08-01',saleDate:'2026-08-05',deliveryDate:'2026-09-20',periodDateOverride:'2026-10-01',status:'resolvida',subtotal:100,vat:23,total:123,orderDetails:{artigos:[{produto:'Estante',unidades:2}],observacoes:'x'.repeat(5000)},quoteLines:[{produto:'x'.repeat(5000)}],customerNotes:[{text:'x'.repeat(5000)}]};
  globalThis.fetch=async url=>{
    const select=new URL(url).searchParams.get('select');
    assert.ok(!select.includes('quoteLines')&&!select.includes('customerNotes')&&!select.includes('observacoes'));
    const row={};
    for(const entry of select.split(',')){
      if(entry==='id'){row.id=record.id;continue;}
      const [alias,path]=entry.split(':');
      row[alias]=path.split('->').slice(1).reduce((value,key)=>value?.[key],record)??null;
    }
    return Response.json([row]);
  };
  try{
    for(const projection of ['commissions','statistics']){
      const [sale]=await listSales({projection});
      assert.equal(sale.subtotal,100);assert.equal(sale.total,123);
      assert.equal(sale.status,'confirmada');assert.equal(sale.paymentStatus,'pago');assert.equal(sale.deliveryStatus,'entregue');
      assert.equal(salePeriodDate(sale),'2026-10-01');
      assert.equal(salePeriodDate({...sale,periodDateOverride:null}),'2026-09-20');
      if(projection==='statistics')assert.deepEqual(sale.orderDetails.artigos,record.orderDetails.artigos);
      else assert.equal(sale.orderDetails,undefined);
      assert.ok(JSON.stringify(sale).length<JSON.stringify(record).length/4);
    }
  }finally{process.env=original;globalThis.fetch=originalFetch;}
});

test('background queries paginate small projections and preserve notes and contacts', async () => {
  const savedFetch = globalThis.fetch;
  const savedUrl = process.env.SUPABASE_URL, savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = 'https://example.invalid'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
  const queries = [];
  globalThis.fetch = async url => {
    const query = new URL(url).searchParams; queries.push(query);
    const select = query.get('select');
    assert.notEqual(select, 'record');
    let rows;
    if (select.includes('customerNotes:')) rows = [
      {id:'a', customerName:'Empresa', nif:'123456789', mergedInto:'b', customerNotes:[{id:'note', text:'Contactar', followUpDate:'2026-11-09'}]},
      {id:'b', customerName:'Empresa', nif:'123456789', customerNotes:[]},
    ];
    else if (select.includes('address:')) rows = [{id:'b',customerName:'Empresa',nif:'123456789',address:'Rua de teste',email:'teste@example.com',phone:'928348117'}];
    else rows = Array.from({length:505},(_,i)=>({id:String(i),customerName:`Empresa ${i}`}));
    return Response.json(rows.slice(Number(query.get('offset')), Number(query.get('offset'))+500));
  };
  try {
    const reminders = dueFollowUps(await listSales({includeArchived:true,projection:'followUps'}),'2026-11-09');
    assert.equal(reminders[0].saleId, 'b'); assert.equal(reminders[0].text,'Contactar');
    const customers = customerSuggestions(await listSales({projection:'customers'}),'Em');
    assert.equal(customers[0].email,'teste@example.com'); assert.equal(customers[0].address,'Rua de teste'); assert.equal(customers[0].phone,'928348117');
    const since='2026-11-09T12:00:00.000Z';
    const notifications = await saleNotifications(since);
    assert.equal(notifications.sales.length,505);
    assert.deepEqual(Object.keys(notifications.sales[0]),['id','customerName']);
    assert.ok(Date.parse(notifications.cursor) <= Date.now()-4*60*1000);
    const polls=queries.slice(-2);
    assert.deepEqual(polls.map(q=>q.get('offset')),['0','500']);
    assert.ok(polls.every(q=>q.get('uploaded_at')===`gte.${since}`));
    await assert.rejects(()=>saleNotifications('invalid'),{status:400});
  } finally {
    globalThis.fetch=savedFetch;
    if(savedUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=savedUrl;
    if(savedKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=savedKey;
  }
});
