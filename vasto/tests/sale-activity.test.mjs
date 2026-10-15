import test from "node:test";
import assert from "node:assert/strict";
import { isSaleInactive, lastSaleActivity } from "../lib/admin/sale-activity.mjs";
const now = Date.parse("2026-10-15T12:00:00Z");
test("reminder requires more than seven full days without updates", () => {
  assert.equal(isSaleInactive({ updatedAt: "2026-10-08T12:00:00Z" }, now), false);
  assert.equal(isSaleInactive({ updatedAt: "2026-10-08T11:59:59Z" }, now), true);
  assert.equal(isSaleInactive({ updatedAt: "2026-10-14T12:00:00Z", issuedAt: "2026-01-01" }, now), false);
  assert.equal(isSaleInactive({ uploadedAt: "2026-10-14T12:00:00Z", issuedAt: "2026-01-01" }, now), false);
  assert.equal(isSaleInactive({ issuedAt: "2026-10-01" }, now), true);
  assert.equal(isSaleInactive({}, now), false);
  assert.equal(lastSaleActivity({ updatedAt: "invalid", uploadedAt: "2026-10-14T12:00:00Z" }), Date.parse("2026-10-14T12:00:00Z"));
});
