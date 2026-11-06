import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultAdminPreferences,normalizeAdminPreferences} from '../lib/admin/preferences.mjs';
test('preferências inválidas voltam a valores seguros e volume fica entre 0 e 100',()=>{
 assert.deepEqual(normalizeAdminPreferences(null),defaultAdminPreferences);
 assert.equal(normalizeAdminPreferences({theme:'dark'}).theme,'dark');
 assert.equal(normalizeAdminPreferences({theme:'unknown',sound:'false',volume:200}).theme,'system');
 assert.equal(normalizeAdminPreferences({sound:'false'}).sound,true);
 assert.equal(normalizeAdminPreferences({volume:200}).volume,100);
 assert.equal(normalizeAdminPreferences({volume:-3}).volume,0);
 assert.equal(normalizeAdminPreferences({volume:NaN}).volume,40);
 assert.equal(normalizeAdminPreferences({desktop:false,inApp:false,chat:false,sales:false,preview:true}).preview,true);
 assert.equal(normalizeAdminPreferences({desktop:false}).desktop,false);
 assert.equal(defaultAdminPreferences.preview,false);
});
