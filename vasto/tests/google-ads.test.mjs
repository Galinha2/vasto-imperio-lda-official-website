import test from "node:test";
import assert from "node:assert/strict";
import { trackSimulatorOrder } from "../lib/google-ads.mjs";

test("simulator conversion requires consent and excludes administration", () => {
  const previousWindow = globalThis.window;
  const events = [];
  try {
    delete globalThis.window;
    assert.doesNotThrow(trackSimulatorOrder);
    globalThis.window = { location: { pathname: "/simulador/racks" }, gtag: (...args) => events.push(args) };
    trackSimulatorOrder();
    window.vastoAdsConsent = false;
    trackSimulatorOrder();
    assert.equal(events.length, 0);
    window.vastoAdsConsent = true;
    trackSimulatorOrder();
    assert.deepEqual(events, [["event", "conversion", { send_to: "AW-17959148068/TouCCJL1zZwdEKS0y_NC" }]]);
    for (const pathname of ["/admin/simulador", "/simulador/admin", "/orcamento/admin"]) {
      window.location.pathname = pathname;
      trackSimulatorOrder();
    }
    assert.equal(events.length, 1);
    window.location.pathname = "/simulador/racks";
    window.gtag = () => { throw new Error("Tag unavailable"); };
    assert.doesNotThrow(trackSimulatorOrder);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
