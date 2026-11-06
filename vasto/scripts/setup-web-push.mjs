// Run from vasto/. Private keys are written only to the ignored local environment file.
import {readFile,appendFile} from 'node:fs/promises';
import webpush from 'web-push';
const file=new URL('../.env.local',import.meta.url);
let existing='';try{existing=await readFile(file,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
const hasPublic=/^WEB_PUSH_VAPID_PUBLIC_KEY=.+$/m.test(existing);
const hasPrivate=/^WEB_PUSH_VAPID_PRIVATE_KEY=.+$/m.test(existing);
if(hasPublic!==hasPrivate)throw new Error('Configuração Web Push incompleta. Complete o par de chaves existente; não substitua apenas uma chave.');
if(!hasPublic){const keys=webpush.generateVAPIDKeys();await appendFile(file,`\n# Notificações push da aplicação de administração\nWEB_PUSH_VAPID_PUBLIC_KEY=${keys.publicKey}\nWEB_PUSH_VAPID_PRIVATE_KEY=${keys.privateKey}\nWEB_PUSH_VAPID_SUBJECT=mailto:geral@vastoimperio.pt\n`,{mode:0o600});console.log('Chaves Web Push preparadas em .env.local. Os valores não são exibidos.');}
else console.log('As chaves Web Push já existem em .env.local e foram preservadas.');
