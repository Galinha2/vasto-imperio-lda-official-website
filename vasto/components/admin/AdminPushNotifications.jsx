'use client';
import {createContext,useCallback,useContext,useEffect,useState} from 'react';
import {IoPhonePortraitOutline} from 'react-icons/io5';
import {useAdminPreferences} from './AdminPreferences';
import styles from './AdminSettings.module.css';
const Context=createContext({active:false});
export const useAdminPush=()=>useContext(Context);
const fromBase64=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'=')),character=>character.charCodeAt(0));
async function api(options){const response=await fetch('/api/admin/push',{cache:'no-store',...options});const data=await response.json();if(!response.ok)throw new Error(data.error||'Não foi possível configurar as notificações.');return data;}
const post=body=>api({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
async function waitForActive(registration){
 if(registration.active)return;
 await new Promise((resolve,reject)=>{
  const worker=registration.installing||registration.waiting;
  if(!worker){reject(new Error('A aplicação ainda não está pronta. Recarregue a página.'));return;}
  const done=()=>{clearTimeout(timer);worker.removeEventListener('statechange',changed);};
  const changed=()=>{if(worker.state==='activated'){done();resolve();}else if(worker.state==='redundant'){done();reject(new Error('Não foi possível preparar a aplicação.'));}};
  const timer=setTimeout(()=>{done();reject(new Error('A aplicação demorou a iniciar. Recarregue a página.'));},12000);
  worker.addEventListener('statechange',changed);changed();
 });
}
export default function AdminPushProvider({children}){
 const {preferences,ready:preferencesReady,requestPermission}=useAdminPreferences();
 const [configuration,setConfiguration]=useState(null);const [registration,setRegistration]=useState(null);const [subscription,setSubscription]=useState(null);
 const [active,setActive]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
 const [supported,setSupported]=useState(false);const [ios,setIos]=useState(false);const [installed,setInstalled]=useState(false);const [installPrompt,setInstallPrompt]=useState(null);
 useEffect(()=>{
  let canceled=false;
  const supported=window.isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window;
  setSupported(supported);setIos(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
  const standalone=window.matchMedia('(display-mode: standalone)');const status=()=>setInstalled(standalone.matches||navigator.standalone===true);status();standalone.addEventListener('change',status);
  const prompt=event=>{event.preventDefault();setInstallPrompt(event);};window.addEventListener('beforeinstallprompt',prompt);window.addEventListener('appinstalled',status);
  api().then(data=>{if(!canceled)setConfiguration(data);}).catch(failure=>{if(!canceled)setError(failure.message);});
  if(supported)(async()=>{try{const reg=await navigator.serviceWorker.register('/admin-push-sw.js',{scope:'/admin/'});await waitForActive(reg);const sub=await reg.pushManager.getSubscription();if(!canceled){setRegistration(reg);setSubscription(sub);}}catch(failure){if(!canceled)setError(failure.message||'Não foi possível preparar a aplicação.');}})();
  return()=>{canceled=true;standalone.removeEventListener('change',status);window.removeEventListener('beforeinstallprompt',prompt);window.removeEventListener('appinstalled',status);};
 },[]);
 const save=useCallback(sub=>post({subscription:sub.toJSON(),preferences}),[preferences]);
 useEffect(()=>{
  if(!subscription||!configuration?.configured||!preferencesReady){setActive(false);return;}
  let canceled=false;
  const timer=setTimeout(()=>{save(subscription).then(()=>{if(!canceled){setActive(preferences.desktop);setError('');}}).catch(failure=>{if(!canceled){setActive(false);setError(failure.message);}});},500);
  return()=>{canceled=true;clearTimeout(timer);};
 },[subscription,configuration,preferencesReady,save,preferences.desktop]);
 async function enable(){
  if(busy)return false;setError('');setMessage('');
  if(ios&&!installed){setError('No iPhone, adicione primeiro esta aplicação ao ecrã principal e abra-a pelo ícone.');return false;}
  if(!supported||!registration){setError('Este navegador ainda não está pronto para receber notificações push. Instale ou recarregue a aplicação. No iPhone, abra pelo ícone no ecrã principal.');return false;}
  if(!configuration?.configured){setError('Falta configurar WEB_PUSH_VAPID_PUBLIC_KEY e WEB_PUSH_VAPID_PRIVATE_KEY no servidor e publicar novamente. Consulte o guia de instalação.');return false;}
  setBusy(true);
  try{
   const permission=await requestPermission();if(permission!=='granted')throw new Error('Permita notificações nas definições deste site ou aplicação.');
   let sub=await registration.pushManager.getSubscription();
   if(sub){const key=sub.options?.applicationServerKey;if(key&&Array.from(new Uint8Array(key)).join(',')!==Array.from(fromBase64(configuration.publicKey)).join(',')){await sub.unsubscribe();sub=null;}}
   sub ||= await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:fromBase64(configuration.publicKey)});
   // Enabling is an explicit opt-in, even if alerts were previously disabled.
   await post({subscription:sub.toJSON(),preferences:{...preferences,desktop:true}});
   setSubscription(sub);setActive(true);setMessage('Dispositivo registado. Pode receber mensagens mesmo com a aplicação fechada. Use “Testar neste dispositivo” para confirmar.');return true;
  }catch(failure){setActive(false);setError(failure.message||'Não foi possível ativar as notificações.');return false;}finally{setBusy(false);}
 }
 async function disable(){if(busy)return;setBusy(true);setError('');try{await api({method:'DELETE'});await subscription?.unsubscribe();setSubscription(null);setActive(false);setMessage('Notificações push desativadas neste dispositivo.');}catch(failure){setError(failure.message);}finally{setBusy(false);}}
 async function test(){if(busy)return;if(!active&&!(await enable()))return;setBusy(true);setMessage('');setError('');try{await post({action:'test'});setMessage('O serviço push aceitou o teste. Confirme a notificação no telemóvel.');}catch(failure){setError(failure.message);}finally{setBusy(false);}}
 async function install(){if(!installPrompt)return;await installPrompt.prompt();await installPrompt.userChoice;setInstallPrompt(null);}
 return <Context.Provider value={{active,busy,error,message,supported,ios,installed,configuration,registration,subscription,enable,disable,test,install,installPrompt}}>{children}</Context.Provider>;
}
export function AdminPushPanel(){
 const push=useAdminPush();
 return <section className={styles.card} aria-labelledby="settings-mobile"><div className={styles.sectionTitle}><IoPhonePortraitOutline/><div><h2 id="settings-mobile">Aplicação no telemóvel</h2><p>Receba mensagens do chat no Android e no iPhone, mesmo fora do computador.</p></div><span className={styles.status}>{push.active?'Ativas neste dispositivo':'Por ativar'}</span></div>
 <p className={styles.hint}>{push.ios&&!push.installed?'No iPhone, abra esta página no Safari e use Partilhar → Adicionar ao ecrã principal. Depois abra pelo novo ícone.':!push.supported?'Este navegador não disponibiliza notificações push. Utilize a aplicação instalada e uma ligação HTTPS.':!push.configuration?'A verificar a configuração do servidor…':!push.configuration.configured?'Faltam as chaves Web Push no servidor. É necessário configurá-las antes de receber avisos.':!push.active?'Toque em Ativar neste dispositivo ou em Testar neste dispositivo para pedir permissão e registar o telemóvel.':'Este dispositivo está registado para receber notificações.'}</p>
 <ol className={styles.installSteps}><li>Instale a aplicação neste telemóvel.</li><li>Abra pelo ícone e inicie sessão. Se quiser manter o acesso, escolha “Manter sessão iniciada” no início de sessão.</li><li>Ative as notificações abaixo e permita os avisos do sistema.</li></ol>
 <div className={styles.actions}>{push.installPrompt&&<button type="button" onClick={push.install} className={styles.secondary}>Instalar aplicação</button>}<button type="button" disabled={push.busy} onClick={push.enable} className={styles.button}>{push.busy?'A preparar…':push.subscription?'Renovar notificações':'Ativar neste dispositivo'}</button><button type="button" disabled={push.busy} onClick={push.test} className={styles.secondary}>Testar neste dispositivo</button>{push.subscription&&<button type="button" disabled={push.busy} onClick={push.disable} className={styles.secondary}>Desativar neste dispositivo</button>}</div>
 {push.configuration&&!push.configuration.configured&&<p className={styles.hint}>As notificações push ainda precisam de configuração no servidor. O guia de instalação está em docs/admin-push.md.</p>}
 {push.error&&<p role="alert" className={styles.error}>{push.error}</p>}{push.message&&<p role="status" className={styles.message}>{push.message}</p>}
 <details className={styles.installHelp}><summary>Como instalar no Android e no iPhone</summary><p><strong>iPhone / iPad (iOS 16.4 ou posterior):</strong> abra esta página no Safari, toque em Partilhar → Adicionar ao ecrã principal. Abra o novo ícone para ativar as notificações.</p><p><strong>Android:</strong> abra esta página no Chrome e escolha Instalar aplicação ou Adicionar ao ecrã principal no menu do navegador.</p><p>Quando chegar uma notificação, toque para abrir a conversa e responder. É necessária ligação à internet. As permissões, a sessão e o modo Não incomodar do telemóvel podem afetar os avisos.</p></details>
 <p className={styles.hint}>Ative em cada telemóvel onde pretende receber avisos. Terminar sessão desliga as notificações desse dispositivo. Alterar as credenciais do admin invalida os registos anteriores.</p>
 </section>;
}
