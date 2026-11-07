import test from 'node:test';
import assert from 'node:assert/strict';
import {configurationDimensions, configurationReference, estimatedTax} from '../lib/configuration-summary.mjs';
import {productLanguagePaths, productStructuredData} from '../lib/product-seo.mjs';
test('requested length stays distinct from actual module length and repeated rows', () => {
 assert.deepEqual(configurationDimensions('10,00', 10050, 100), {requested:10,effective:10.05,valid:true,difference:.05,total:1005});
 assert.equal(configurationDimensions('10', 9750, 2).difference,-.25);
 assert.equal(configurationDimensions('no',1000).valid,false);
 assert.equal(configurationDimensions('0',1000).valid,false);
});
test('tax rounds cents, including discounted and zero totals', () => {
 assert.deepEqual(estimatedTax(84.68),{net:84.68,vat:19.48,gross:104.16});
 assert.deepEqual(estimatedTax(0),{net:0,vat:0,gross:0});
 assert.deepEqual(estimatedTax(100),{net:100,vat:23,gross:123});
});
test('reference is reproducible, changes with configuration and survives export', () => {
 const quote={configuration:{desiredLength:'10'},items:[{produto:'Test',unidades:2}],total:100};
 const ref=configurationReference(quote);
 assert.equal(ref,configurationReference(structuredClone(quote)));
 assert.notEqual(ref,configurationReference({...quote,total:90}));
 assert.equal(ref,configurationReference({...quote,reference:ref,details:'Includes reference'}));
});
test('localized product metadata links to canonical landing pages without fabricated offers',()=>{
 const paths=productLanguagePaths('racks-industriais');
 assert.equal(paths['pt-PT'],'/racks-industriais');
 assert.equal(paths['en-US'],'/produtos/en/racks-industriais');
 const data=productStructuredData({id:'racks-industriais',text:'Racks',description:'<b>Loads</b>',image:'/rack.png'},'pt');
 assert.equal(data.description,'Loads'); assert.equal(data.url,'https://vastoimperio.pt/racks-industriais');
 assert.equal(data.offers,undefined); assert.equal(data.aggregateRating,undefined);
});
