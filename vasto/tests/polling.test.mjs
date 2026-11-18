import test from 'node:test';
import assert from 'node:assert/strict';
import { startPolling } from '../lib/polling.mjs';

const flush = async () => { for (let n=0;n<30;n++) await Promise.resolve(); };
function harness() {
  let now=1000000, next=0;
  const timers=new Map(), stored=new Map(), channels=new Map(), locks=new Set();
  const environment=()=>({
    document:Object.assign(new EventTarget(),{hidden:false}),window:new EventTarget(),
    navigator:{onLine:true,locks:{request:async(name,options,callback)=>{
      if(locks.has(name))return callback(null);
      locks.add(name);try{return await callback({name});}finally{locks.delete(name);}
    }}},
    now:()=>now,
    setTimeout:(callback,delay)=>{const id=++next;timers.set(id,{at:now+delay,callback});return id;},
    clearTimeout:id=>timers.delete(id),
    storage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)},
    channel:name=>{
      const peers=channels.get(name)||new Set();channels.set(name,peers);
      const channel={postMessage:data=>{for(const peer of peers)if(peer!==channel)peer.onmessage?.({data:structuredClone(data)});},close:()=>peers.delete(channel)};
      peers.add(channel);return channel;
    },
  });
  async function advance(ms) {
    const until=now+ms;
    for(;;){
      const due=[...timers].filter(([,timer])=>timer.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!due)break;
      now=due[1].at;timers.delete(due[0]);due[1].callback();await flush();
    }
    now=until;await flush();
  }
  return {environment,advance,timers,stored};
}

test('hidden and offline pages stop polling and resume on visibility or connectivity',async()=>{
  const h=harness(),env=h.environment();let calls=0;
  env.document.hidden=true;
  const stop=startPolling({interval:5000,environment:env,load:async()=>++calls});
  await h.advance(60000);assert.equal(calls,0);
  env.document.hidden=false;env.document.dispatchEvent(new Event('visibilitychange'));await flush();assert.equal(calls,1);
  await h.advance(5000);assert.equal(calls,2);
  env.navigator.onLine=false;env.window.dispatchEvent(new Event('offline'));
  await h.advance(60000);assert.equal(calls,2);
  env.navigator.onLine=true;env.window.dispatchEvent(new Event('online'));await flush();assert.equal(calls,3);
  env.document.hidden=true;env.document.dispatchEvent(new Event('visibilitychange'));
  await h.advance(60000);assert.equal(calls,3);
  stop();assert.equal(h.timers.size,0);
});

test('background polling is slow without push and stops when push becomes active',async()=>{
  const h=harness(),env=h.environment();let calls=0,push=false;
  env.document.hidden=true;
  const stop=startPolling({interval:30000,hiddenInterval:()=>push?0:120000,environment:env,load:async()=>++calls});
  await flush();await h.advance(119999);assert.equal(calls,1);
  await h.advance(1);assert.equal(calls,2);
  push=true;await h.advance(240000);assert.equal(calls,2);
  env.document.hidden=false;env.document.dispatchEvent(new Event('visibilitychange'));await flush();assert.equal(calls,3);
  stop();
});

test('multiple tabs share one request per interval even when their timers start at different times',async()=>{
  const h=harness(),env1=h.environment(),env2=h.environment();let requests=0;
  const first=[],second=[];
  const one=startPolling({shareKey:'updates',interval:30000,environment:env1,load:async()=>({request:++requests}),onData:(data,meta)=>first.push({data,...meta})});
  await flush();await h.advance(7000);
  const two=startPolling({shareKey:'updates',interval:30000,environment:env2,load:async()=>({request:++requests}),onData:(data,meta)=>second.push({data,...meta})});
  await flush();assert.equal(requests,1);
  await h.advance(23000);assert.equal(requests,2);
  assert.equal(first.at(-1).data.request,2);assert.equal(second.at(-1).data.request,2);
  assert.equal(first.at(-1).remote,false);assert.equal(second.at(-1).remote,true);
  await h.advance(60000);assert.equal(requests,4);
  one();two();assert.equal(h.timers.size,0);
  assert.ok([...h.stored.values()].every(value=>/^\d+$/.test(value)),'shared polling stores timestamps, not customer payloads');
});

test('closing the tab performing requests lets another tab take over',async()=>{
  const h=harness(),env1=h.environment(),env2=h.environment();let calls=0;
  const one=startPolling({shareKey:'updates',interval:30000,environment:env1,load:async()=>++calls});
  await flush();
  const two=startPolling({shareKey:'updates',interval:30000,environment:env2,load:async()=>++calls});
  await flush();one();await h.advance(30000);assert.equal(calls,2);two();
});

test('errors back off and a successful response restores the normal interval',async()=>{
  const h=harness(),env=h.environment();let calls=0;
  const stop=startPolling({interval:10000,environment:env,load:async()=>{calls++;if(calls<=2)throw new Error('unavailable');return {};}});
  await flush();assert.equal(calls,1);
  await h.advance(19999);assert.equal(calls,1);
  await h.advance(1);assert.equal(calls,2);
  await h.advance(39999);assert.equal(calls,2);
  await h.advance(1);assert.equal(calls,3);
  await h.advance(10000);assert.equal(calls,4);stop();
});

test('a slow request is not duplicated, cleanup aborts it and late results are discarded',async()=>{
  const h=harness(),env=h.environment();let calls=0,resolve,signal;
  const received=[];
  const stop=startPolling({interval:5000,environment:env,load:s=>{calls++;signal=s;return new Promise(done=>{resolve=done;});},onData:data=>received.push(data)});
  await flush();await h.advance(20000);
  env.document.dispatchEvent(new Event('visibilitychange'));await flush();assert.equal(calls,1);
  stop();assert.equal(signal.aborted,true);resolve('late');await flush();
  assert.deepEqual(received,[]);assert.equal(h.timers.size,0);
});

test('browsers without BroadcastChannel or storage still poll normally',async()=>{
  const h=harness(),env=h.environment();let calls=0;
  env.channel=()=>{throw new Error('blocked');};env.storage=null;
  const stop=startPolling({shareKey:'updates',interval:30000,environment:env,load:async()=>++calls});
  await flush();await h.advance(30000);assert.equal(calls,2);stop();
});

test('a newly opened tab receives the live cached response without an extra request',async()=>{
  const h=harness(),oneEnv=h.environment(),twoEnv=h.environment();let calls=0;
  const received=[];
  const one=startPolling({shareKey:'live',interval:30000,environment:oneEnv,load:async()=>({count:++calls})});
  await flush();await h.advance(5000);
  const two=startPolling({shareKey:'live',interval:30000,environment:twoEnv,load:async()=>({count:++calls}),onData:data=>received.push(data)});
  await flush();assert.equal(calls,1);assert.deepEqual(received,[{count:1}]);
  one();two();
});

test('reopening a view with no live cached response does not wait a full polling interval',async()=>{
  const h=harness();let calls=0;
  const one=startPolling({shareKey:'reopen',interval:60000,environment:h.environment(),load:async()=>++calls});
  await flush();one();
  const two=startPolling({shareKey:'reopen',interval:60000,environment:h.environment(),load:async()=>++calls});
  await flush();await h.advance(1000);assert.equal(calls,2);two();
});

test('default browser timers are invoked with the Window receiver',async()=>{
  const h=harness(),env=h.environment();
  const saved=new Map(['window','document','navigator'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  env.window.setTimeout=function(task,delay){assert.equal(this,env.window);return env.setTimeout(task,delay);};
  env.window.clearTimeout=function(id){assert.equal(this,env.window);env.clearTimeout(id);};
  for(const [key,value] of [['window',env.window],['document',env.document],['navigator',env.navigator]])Object.defineProperty(globalThis,key,{value,configurable:true});
  let stop;
  try {
    let calls=0;
    stop=startPolling({interval:5000,load:async()=>++calls});
    await flush();assert.equal(calls,1);assert.equal(h.timers.size,1);
    stop();assert.equal(h.timers.size,0);
  } finally {
    stop?.();
    for(const [key,descriptor]of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
  }
});

test('clock movement between creating a packet and publishing it cannot discard a valid shared response',async()=>{
  const h=harness(),oneEnv=h.environment(),twoEnv=h.environment();let clock=1000000,calls=0;
  oneEnv.now=twoEnv.now=()=>++clock;
  const received=[];
  const one=startPolling({shareKey:'precise-clock',interval:30000,environment:oneEnv,load:async()=>({count:++calls})});
  const two=startPolling({shareKey:'precise-clock',interval:30000,environment:twoEnv,load:async()=>({count:++calls}),onData:data=>received.push(data)});
  await flush();assert.equal(calls,1);assert.deepEqual(received,[{count:1}]);one();two();
});
