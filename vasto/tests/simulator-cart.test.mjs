import test from 'node:test';
import assert from 'node:assert/strict';
import { cartQuote, validCartEntry, CART_LIMIT } from '../lib/simulator-cart.mjs';
const entry = {id:'test',label:'Picking',details:'2 módulos, 3 níveis',quantity:1,discountPercent:10,image:'data:image/jpeg;base64,AAAA',items:[{produto:'Viga',refCompleta:'3.1',preco:20,unidades:4,total:80,isPortes:false}]};
test('combina famílias e configurações distintas sem perder identidade ou aplicar o desconto duas vezes',()=>{
 const rack = {...entry,id:'rack',label:'Racks',quantity:2,discountPercent:0,items:[{produto:'Bastidor',refCompleta:'2.1',preco:100,unidades:2,total:200,isPortes:false}]};
 const quote=cartQuote([entry,{...entry,id:'picking-2',details:'Outra medida'},rack]);
 assert.equal(quote.total,544);
 assert.equal(quote.discountPercent,0);
 assert.equal(quote.items.length,3);
 assert.equal(quote.items[0].total,72);
 assert.equal(quote.items[2].unidades,4);
 assert.equal(quote.items[2].total,400);
 assert.equal(quote.items[2].refCompleta,'2.1');
 assert.ok(quote.details.includes('Outra medida'));
 assert.notEqual(quote.items[0].produto,quote.items[1].produto);
 assert.equal(entry.items[0].total,80);
});
test('quantidades, descontos, limites e preços fracionários',()=>{
 assert.equal(CART_LIMIT,10);
 assert.ok(validCartEntry(entry));
 for(const invalid of [{...entry,quantity:0},{...entry,quantity:1.5},{...entry,discountPercent:101},{...entry,image:'https://example.com'},{...entry,items:[]}])assert.equal(validCartEntry(invalid),false);
 const quote=cartQuote([{...entry,discountPercent:15,items:[{produto:'Peça',preco:1.23,unidades:3,total:3.69}]}]);
 assert.equal(quote.total,3.14);
 assert.ok(Math.abs(quote.items[0].preco*quote.items[0].unidades-quote.total)<1e-8);
 assert.deepEqual(cartQuote([]).items,[]);
 assert.equal(cartQuote([]).total,0);
});

test('três filas aparecem como quantidade 3 sem triplicar os artigos e o preço',()=>{
 const rows={...entry,baseQuantity:3,quantity:3,items:[{produto:'Viga',refCompleta:'3.1',preco:20,unidades:12,total:240,isPortes:false}]};
 assert.equal(cartQuote([rows]).total,216);
 assert.equal(cartQuote([rows]).items[0].unidades,12);
 assert.equal(cartQuote([{...rows,quantity:2}]).items[0].unidades,8);
 assert.equal(cartQuote([{...rows,quantity:2}]).total,144);
 assert.ok(validCartEntry({...rows,quantity:30}));
});
test('carrinhos antigos com várias filas mantêm o mesmo total após migração',async()=>{
 const {normalizeCartEntry}=await import('../lib/simulator-cart.mjs');
 const old={...entry,quantity:2,details:'Linhas de estantes lado a lado: 3'};
 const migrated=normalizeCartEntry(old);
 assert.equal(migrated.quantity,6);
 assert.equal(migrated.baseQuantity,3);
 assert.equal(cartQuote([migrated]).total,cartQuote([old]).total);
 assert.deepEqual(normalizeCartEntry(migrated),migrated);
});

test('título apresenta altura, comprimento real da fila e profundidade em milímetros',async()=>{
 const {cartEntryTitle}=await import('../lib/simulator-cart.mjs');
 const example={...entry, details:'Altura: 2,50 m · Comprimento por fila: 1,20 m · Profundidade: 0,80 m'};
 assert.equal(cartEntryTitle(example),'Estante picking - 2500x1200x800 mm');
 assert.equal(cartEntryTitle({...example, quantity:3}),'Estante picking - 2500x1200x800 mm');
 assert.equal(cartEntryTitle({...example,details:'Altura: 2,50 m · Comprimento por fila: 2,80 m · Profundidade: 0,80 m'}),'Estante picking - 2500x2800x800 mm');
 assert.equal(cartEntryTitle({...example,label:'Planeamento Picking'}),'Planeamento Picking');
 assert.equal(cartEntryTitle({...entry,details:''}),'Picking');
});
