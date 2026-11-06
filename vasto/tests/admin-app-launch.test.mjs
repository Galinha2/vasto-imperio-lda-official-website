import test from 'node:test';
import assert from 'node:assert/strict';
import {adminLaunchDestination as destination} from '../lib/admin/app-launch.mjs';
test('old installed inbox shortcut opens sales',()=>{
 assert.equal(destination('/admin/conversas','',true),'/admin');
 assert.equal(destination('/admin/conversas/','',true),'/admin');
});
test('notification conversation is preserved',()=>{
 assert.equal(destination('/admin/conversas',`?chat=${'a'.repeat(64)}`,true),null);
});
test('browser and other pages remain unchanged',()=>{
 assert.equal(destination('/admin/conversas','',false),null);
 assert.equal(destination('/admin','',true),null);
 assert.equal(destination('/admin/definicoes','',true),null);
});
