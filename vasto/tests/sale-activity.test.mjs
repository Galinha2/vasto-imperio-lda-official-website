import test from "node:test";
import assert from "node:assert/strict";
import { isSaleInactive, lastSaleActivity } from "../lib/admin/sale-activity.mjs";
const now = Date.parse("2026-10-15T12:00:00Z");
test("reminder requires more than fourteen full days, only for customer-confirmed sales without updates", () => {
  assert.equal(isSaleInactive({ status: "confirmada", updatedAt: "2026-10-01T12:00:00Z" }, now), false);
  assert.equal(isSaleInactive({ status: "confirmada", updatedAt: "2026-10-01T11:59:59Z" }, now), true);
  assert.equal(isSaleInactive({ status: "confirmada", updatedAt: "2026-10-14T12:00:00Z", issuedAt: "2026-01-01" }, now), false);
  assert.equal(isSaleInactive({ status: "confirmada", uploadedAt: "2026-10-14T12:00:00Z", issuedAt: "2026-01-01" }, now), false);
  assert.equal(isSaleInactive({ status: "confirmada", issuedAt: "2026-09-30" }, now), true);
  assert.equal(isSaleInactive({}, now), false);
  assert.equal(lastSaleActivity({ updatedAt: "invalid", uploadedAt: "2026-10-14T12:00:00Z" }), Date.parse("2026-10-14T12:00:00Z"));
});

test("unconfirmed quotes never trigger inactivity warnings", () => {
  for (const status of ["em_preparacao", undefined, "vendida"]) {
    assert.equal(isSaleInactive({ status, updatedAt: "2026-01-01T12:00:00Z" }, now), false);
  }
});
