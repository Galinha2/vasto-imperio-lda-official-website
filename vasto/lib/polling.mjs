// Private responses are shared only between live tabs, never written to storage.
// Storage holds a timestamp so tabs can coordinate even with staggered timers.
export function startPolling({ load, onData = () => {}, interval, hiddenInterval = 0, shareKey, environment }) {
  const env = environment || {
    document, window, navigator, storage: (() => { try { return localStorage; } catch { return null; } })(),
    channel: name => typeof BroadcastChannel === 'function' ? new BroadcastChannel(name) : null,
    now: Date.now, setTimeout: (task, delay) => window.setTimeout(task, delay), clearTimeout: id => window.clearTimeout(id),
  };
  const controller = new AbortController();
  let stopped = false, pending = false, timer, failures = 0, lastPacket;
  const startedAt = env.now();
  let channel;
  try { channel = shareKey ? env.channel?.(`vasto-poll:${shareKey}`) : null; } catch { channel = null; }
  const stampKey = `vasto-poll-time:${shareKey}`;
  const delayNow = () => env.navigator.onLine === false ? 0 : env.document.hidden
    ? (typeof hiddenInterval === 'function' ? hiddenInterval() : hiddenInterval) : interval;
  const readStamp = () => { try { return Number(env.storage?.getItem(stampKey)) || 0; } catch { return 0; } };
  const writeStamp = (at = env.now()) => { try { env.storage?.setItem(stampKey, String(at)); } catch { /* Poll independently if storage is unavailable. */ } };
  const deliver = (packet, remote = false) => {
    if (stopped || (lastPacket && packet.at < lastPacket.at)) return;
    lastPacket = packet;
    onData(packet.value, {remote});
  };
  if (channel) {
    channel.onmessage = ({ data }) => {
      if (data?.type === 'request') {
        if (lastPacket && lastPacket.at >= readStamp()) channel.postMessage(lastPacket);
      } else if (data?.type === 'data' && data.at >= readStamp()) deliver(data, true);
    };
    channel.postMessage({type:'request'});
  }
  function schedule(delay) {
    env.clearTimeout(timer);
    if (!stopped && delay > 0) timer = env.setTimeout(tick, delay);
  }
  async function tick() {
    if (stopped || pending) return;
    let delay = delayNow();
    if (!delay) return;
    pending = true;
    try {
      const run = async () => {
        if (stopped || !delayNow()) return;
        const stamp = channel ? readStamp() : 0;
        const age = env.now() - stamp;
        if (stamp && age >= 0 && age < delay && (lastPacket || env.now() - startedAt < 1000)) {
          delay = Math.min(delay - age, lastPacket ? delay : 1000);
          return;
        }
        // Web Locks serialize tabs. Only the fallback claims a timestamp before
        // fetching; aborted requests must not stall a fresh page for a full interval.
        if (channel && !env.navigator.locks?.request) writeStamp();
        const data = await load(controller.signal);
        if (stopped) return;
        failures = 0;
        const packet = {type:'data',at:env.now(),value:data};
        if (channel) { writeStamp(packet.at); channel.postMessage(packet); }
        deliver(packet);
      };
      if (channel && env.navigator.locks?.request) {
        await env.navigator.locks.request(`vasto-poll:${shareKey}`, { ifAvailable: true }, lock => lock ? run() : (delay = Math.min(delay, 1000)));
      } else await run();
    } catch {
      // Slow down repeated errors instead of hammering a suspended/unavailable API.
      failures = Math.min(failures + 1, 5);
      delay = Math.min(300000, delayNow() * 2 ** failures);
    } finally {
      pending = false;
      if (!stopped && delayNow()) schedule(Math.max(1000, Math.min(delay || delayNow(), delayNow() * 2 ** failures)));
    }
  }
  const wake = () => { env.clearTimeout(timer); if (delayNow()) void tick(); };
  env.document.addEventListener('visibilitychange', wake);
  env.window.addEventListener('online', wake);
  env.window.addEventListener('offline', wake);
  void tick();
  return () => {
    stopped = true; env.clearTimeout(timer); controller.abort(); channel?.close();
    env.document.removeEventListener('visibilitychange', wake);
    env.window.removeEventListener('online', wake);
    env.window.removeEventListener('offline', wake);
  };
}
