import test from "node:test";
import assert from "node:assert/strict";
import { customerEmail } from "../lib/admin/customer-email.mjs";
test("optional client emails are trimmed and validated",()=>{
 assert.equal(customerEmail(undefined),"");
 assert.equal(customerEmail(" cliente@example.com "),"cliente@example.com");
 for(const value of ["invalid","a@example.com,b@example.com","a@example.com\r\nBcc: b@example.com"])assert.throws(()=>customerEmail(value),{status:400});
});
