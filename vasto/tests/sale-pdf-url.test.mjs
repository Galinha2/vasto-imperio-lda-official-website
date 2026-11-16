import test from 'node:test';
import assert from 'node:assert/strict';
import { salePdfUrl } from '../lib/admin/sale-pdf-url.mjs';
import { notifySaleSaved, subscribeSaleUpdates } from '../lib/admin/sale-updates.mjs';

test('PDF address changes with the document revision and stays stable for unrelated edits', () => {
  const sale = {id:'abc',updatedAt:'2026-11-16T10:00:00Z'};
  assert.equal(salePdfUrl(sale),'/api/admin/sales/abc/pdf?v=0');
  const revised = {...sale,quoteRevision:1};
  assert.notEqual(salePdfUrl(revised),salePdfUrl(sale));
  assert.equal(salePdfUrl({...revised,updatedAt:'2026-11-16T10:30:00Z'}),salePdfUrl(revised));
  assert.equal(salePdfUrl(revised,true),'/api/admin/sales/abc/pdf?v=1&download=1');
});

test('saving updates an open sales view and signals other tabs without sending customer data', () => {
  const originalWindow=globalThis.window, originalStorage=globalThis.localStorage;
  const browser=new EventTarget();
  globalThis.window=browser;
  const saved=[], external=[], writes=[];
  globalThis.localStorage={setItem:(key,value)=>writes.push({key,newValue:value})};
  const unsubscribe=subscribeSaleUpdates(sale=>saved.push(sale),id=>external.push(id));
  try {
    const sale={id:'a'.repeat(64),quoteRevision:2,customerName:'Cliente privado',total:123};
    notifySaleSaved(sale);
    assert.deepEqual(saved,[sale]);
    assert.equal(writes.length,1);
    const data=JSON.parse(writes[0].newValue);
    assert.equal(data.id,sale.id);
    assert.equal(data.revision,2);
    assert.equal(data.customerName,undefined);
    assert.equal(data.total,undefined);
    const storage=Object.assign(new Event('storage'),writes[0]);
    browser.dispatchEvent(storage);
    assert.deepEqual(external,[sale.id]);
    browser.dispatchEvent(Object.assign(new Event('storage'),{key:writes[0].key,newValue:'invalid'}));
    assert.equal(external.length,1);
    unsubscribe();
    notifySaleSaved({...sale,quoteRevision:3});
    assert.equal(saved.length,1);
    browser.dispatchEvent(storage);
    assert.equal(external.length,1);
  } finally {
    unsubscribe();
    if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
    if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage;
  }
});
