import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=name=>JSON.parse(fs.readFileSync(new URL(`../assets/${name}.json`,import.meta.url),'utf8'));
test('PT and EN picking frame tables include every catalogue depth for each advertised height',()=>{
 const groups=new Map();
 for(const item of read('orcamento').produtos){
  if(!item.produto.startsWith('Bastidor Picking'))continue;
  const match=item.produto.match(/(\d+)x(\d+)mm/);if(!match)continue;
  const [h,d]=match.slice(1).map(Number);if(h<2000)continue;
  if(!groups.has(h))groups.set(h,new Set());groups.get(h).add(d);
 }
 for(const language of ['pt','en']){
  const p=read(`content${language}`).productsShowcase.products.find(p=>p.id==='estantes-picking');
  const rows=p.tabela.filter(row=>row.profundidade_mm);
  assert.equal(rows.length,groups.size);
  for(const row of rows){assert.deepEqual(row.profundidade_mm.split('|').map(Number),[...groups.get(row.altura_mm)].sort((a,b)=>a-b));assert.equal(row.largura_mm,undefined);}
  assert.ok(!p.description.includes('5500')&&!p.description.includes('5,500'));
  assert.ok(p.description.includes('1200')||p.description.includes('1,200'));
 }
});
