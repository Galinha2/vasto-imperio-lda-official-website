/* Push only: never cache administration pages, APIs, credentials or customer data. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
function destination(value){
  try{const url=new URL(value,self.location.origin);if(url.origin===self.location.origin&&(url.pathname==='/admin/conversas'||url.pathname==='/admin/definicoes'))return url.href;}catch{/* Use the inbox for malformed targets. */}
  return new URL('/admin/conversas',self.location.origin).href;
}
self.addEventListener('push',event=>{
  let data={};try{data=event.data?.json()||{};}catch{/* Even a malformed push must show a notification. */}
  event.waitUntil(self.registration.showNotification(typeof data.title==='string'?data.title:'Vasto Império',{body:typeof data.body==='string'?data.body:'Recebeu uma mensagem no chat do site.',icon:'/admin-icon-192.png',badge:'/admin-icon-192.png',tag:typeof data.tag==='string'?data.tag:'vasto-chat',silent:data.silent===true,data:{url:destination(data.url)}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();const url=destination(event.notification.data?.url);
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=windows.find(client=>{const current=new URL(client.url);return current.origin===self.location.origin&&current.pathname.startsWith('/admin');});
    if(existing){await existing.navigate(url);await existing.focus();}else await self.clients.openWindow(url);
  })());
});
