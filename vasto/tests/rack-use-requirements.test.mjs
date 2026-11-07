import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeRackUse,rackUseDetails} from '../lib/rack-use-requirements.mjs';
test('optional rack requirements leave existing quotes unchanged when empty',()=>{assert.equal(rackUseDetails({}),'');assert.equal(rackUseDetails(null),'');});
test('requirements discard legacy weight and quantity fields while preserving height and protection',()=>{
 const value={pallet:'EUR 1200 × 800 mm',weight:'900',loadHeight:'1500',palletsPerLevel:'2',protection:true};
 const copy=JSON.parse(JSON.stringify(normalizeRackUse(value)));
 assert.deepEqual(copy,{pallet:value.pallet,loadHeight:value.loadHeight,protection:true});const details=rackUseDetails(copy);
 for(const text of ['1,50 m','não incluídas na estimativa','sujeita a validação técnica'])assert.ok(details.includes(text));
 assert.equal(normalizeRackUse(value).weight,undefined);assert.equal(normalizeRackUse(value).palletsPerLevel,undefined);
 assert.equal(normalizeRackUse({pallet:'<script>'}).pallet,'');
});

test('Euro pallets keep real dimensions and never silently extend through neighbouring bays',async()=>{
 const {rackPalletLayout}=await import('../lib/rack-use-requirements.mjs');
 const euro=rackPalletLayout({pallet:'EUR 1200 × 800 mm',palletsPerLevel:'3',loadHeight:'1500'},2.3);
 assert.equal(euro.width,.8);assert.equal(euro.depth,1.2);assert.equal(euro.loadHeight,1.5);
 assert.equal(euro.count,2);
 for(const x of euro.centres)assert.ok(Math.abs(x)+euro.width/2<=2.3/2);
 assert.equal(rackPalletLayout({pallet:'Outra / a confirmar'},2.3),null);
 assert.equal(rackPalletLayout({pallet:'1200 × 1000 mm'},2.3).width,1);
});


test('two metre-wide pallets fit 2.20 m beams and three Euro pallets fit 2.70 m beams',async()=>{
 const {rackPalletLayout,formatLoadHeight,rackPalletLabel}=await import('../lib/rack-use-requirements.mjs');
 const wide=rackPalletLayout({pallet:'1200 × 1000 mm',palletsPerLevel:'2'},2.2);
 const euro=rackPalletLayout({pallet:'EUR 1200 × 800 mm',palletsPerLevel:'3'},2.7);
 assert.equal(wide.count,2);assert.equal(euro.count,3);
 assert.equal(rackPalletLayout({pallet:'1200 × 1000 mm',palletsPerLevel:'3'},2.2).count,2);
 assert.equal(formatLoadHeight('1500'),'1,50');
 assert.equal(formatLoadHeight('1250',true),'1.25');
 assert.ok(rackPalletLabel('EUR 1200 × 800 mm').includes('1,20 × 0,80 m'));
});

test('legacy requested quantities never reduce the maximum pallet count',async()=>{const {rackPalletLayout}=await import('../lib/rack-use-requirements.mjs');assert.equal(rackPalletLayout({pallet:'EUR 1200 × 800 mm',palletsPerLevel:'1'},2.7).count,3);assert.equal(rackPalletLayout({pallet:'1200 × 1000 mm',palletsPerLevel:'1'},2.2).count,2);});
