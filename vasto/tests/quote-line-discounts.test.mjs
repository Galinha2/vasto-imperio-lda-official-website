import test from 'node:test';
import assert from 'node:assert/strict';
import {lineNet, lineDiscount} from '../lib/quote-discounts.mjs';
import {validateQuoteLines} from '../lib/admin/editable-quote.mjs';
test('mixed rack, picking and light discounts survive JSON and validate against net totals',()=>{
 const lines=[25,15,10].map((discountPercent,i)=>({produto:['Racks','Picking','Ligeiras'][i],preco:100,unidades:2,total:200,discountPercent}));
 assert.equal(lines.reduce((sum,line)=>sum+lineNet(line,50),0),500);
 assert.ok(validateQuoteLines(JSON.parse(JSON.stringify(lines)),500,50));
 assert.equal(validateQuoteLines(lines,300,50),false);
 assert.equal(validateQuoteLines([{...lines[0],discountPercent:101}],-2,0),false);
 assert.equal(validateQuoteLines([{...lines[0],discountPercent:'25'}],150,0),false);
});
test('legacy default, explicit zero, empty override and transport',()=>{
 const line={produto:'Viga',preco:100,unidades:1,total:100};
 assert.equal(lineNet(line,15),85);
 assert.equal(lineNet({...line,discountPercent:0},15),100);
 assert.equal(lineNet({...line,discountPercent:null},15),85);
 assert.equal(lineDiscount({...line,isPortes:true,discountPercent:80},50),0);
 assert.ok(validateQuoteLines([line,{...line,isPortes:true,discountPercent:80}],185,15));
});

test('merging mixed discounts preserves net prices without applying discounts twice',async()=>{
 const {combinedQuoteLines}=await import('../lib/admin/merge-quotes.mjs');
 const source=[25,15,10].map((discountPercent,i)=>({produto:['Racks','Picking','Ligeiras'][i],preco:100,unidades:2,total:200,discountPercent}));
 const merged=combinedQuoteLines([{lines:source,discount:50}]);
 assert.equal(merged.reduce((sum,line)=>sum+lineNet(line,0),0),500);
 assert.ok(validateQuoteLines(merged,500,0));
});
