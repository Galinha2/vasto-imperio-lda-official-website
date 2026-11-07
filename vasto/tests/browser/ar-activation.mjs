// Run with the production server started locally; this emulates browser AR support.
// It verifies React integration and real USDZ export, not physical camera placement.
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3123';
try{
 for(const variant of ['Safari','Chrome']){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const agent=variant==='Safari'?'Version/18.0 Mobile/15E148 Safari/604.1':'CriOS/130.0.0.0 Mobile/15E148 Safari/604.1';
  await page.setUserAgent(`Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ${agent}`);
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  await page.evaluateOnNewDocument(delaySupport=>{
   if(delaySupport)customElements.whenDefined('model-viewer').then(()=>{
    const prototype=customElements.get('model-viewer').prototype;
    let owner=prototype;while(owner&&!Object.getOwnPropertyDescriptor(owner,'canActivateAR'))owner=Object.getPrototypeOf(owner);
    const original=Object.getOwnPropertyDescriptor(owner,'canActivateAR').get;
    Object.defineProperty(prototype,'canActivateAR',{configurable:true,get(){
     if(!this.loaded)return false;
     this.__supportCheckedAt??=performance.now();
     return performance.now()-this.__supportCheckedAt>=500&&original.call(this);
    }});
   });
   const supports=DOMTokenList.prototype.supports;
   DOMTokenList.prototype.supports=function(token){return token==='ar'||supports.call(this,token);};
   const click=HTMLAnchorElement.prototype.click;
   HTMLAnchorElement.prototype.click=function(){if(this.rel==='ar'){window.__arLaunch={href:this.href,images:this.querySelectorAll('img').length};return;}return click.call(this);};
   const create=URL.createObjectURL.bind(URL);
   URL.createObjectURL=blob=>{if(blob.type==='model/vnd.usdz+zip')window.__usdz=blob;return create(blob);};
  },variant==='Chrome');
  await page.goto(base+'/simulador/estantes-ligeiras',{waitUntil:'networkidle2'});
  await page.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent==='Apenas essenciais')?.click();[...document.querySelectorAll('[aria-label="Tipo de visualização"] button')].find(b=>b.textContent==='3D').click();});
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Ver no meu espaço'&&!b.disabled),{timeout:30000});
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Ver no meu espaço').click());
  await page.waitForFunction(()=>{const v=document.querySelector('model-viewer'),b=document.querySelector('dialog button[aria-busy]');return v?.loaded&&v.ar===true&&v.canActivateAR&&b&&!b.disabled;},{timeout:60000});
  await page.click('dialog button[aria-busy]');
  await page.waitForFunction(()=>window.__arLaunch&&window.__usdz,{timeout:60000});
  const result=await page.evaluate(async()=>({launch:window.__arLaunch,size:window.__usdz.size,signature:[...new Uint8Array(await window.__usdz.slice(0,4).arrayBuffer())],scale:document.querySelector('model-viewer').getAttribute('ar-scale')}));
  assert.ok(result.launch.href.startsWith('blob:'));assert.ok(result.launch.href.includes('allowsContentScaling=0'));
  assert.equal(result.launch.images,1);assert.ok(result.size>1000);assert.deepEqual(result.signature,[80,75,3,4]);assert.equal(result.scale,'fixed');assert.deepEqual(errors,[]);
  console.log(`${variant} iPhone emulation: AR enabled, button clickable and real USDZ (${result.size} bytes) handed to Quick Look at fixed scale.`);
  await page.click('dialog header button');await page.waitForFunction(()=>!document.querySelector('dialog[open]'));await page.close();
 }
}finally{await browser.close();}
