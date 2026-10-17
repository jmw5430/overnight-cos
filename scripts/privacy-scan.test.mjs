// Every value below is invented, and the scanner checks this file too, so its examples have to
// be built from parts at run time rather than written out whole.
import { test } from "node:test";
import assert from "node:assert/strict";
import { scanText, termPattern } from "./privacy-scan.mjs";

const at = "@";
const kinds = (text, opts) => scanText(text, opts).map((h) => h.kind);

test("generic layer catches real-looking contact details and ids", () => {
  assert.deepEqual(kinds(`write to sam${at}fakecorp.io`), ["email"]);
  assert.deepEqual(kinds("call " + ["415", "555", "0134"].join(" ")), ["phone"]);
  assert.deepEqual(kinds("page " + "ab12".repeat(8)), ["notion-id"]);
  assert.deepEqual(kinds("user " + "U0" + "ABCDEF12"), ["slack-id"]);
  assert.deepEqual(kinds("host my-mac.tail" + "1a2b3c" + ".ts.net"), ["tailnet"]);
  assert.deepEqual(kinds("/Us" + "ers/sam/notes"), ["home-path"]);
});

test("placeholders the docs use are allowed", () => {
  assert.deepEqual(kinds("page " + "0".repeat(31) + "3"), []);
  assert.deepEqual(kinds("page " + "0".repeat(30) + "13"), ["notion-id"], "only a single trailing digit counts as a placeholder");
  assert.deepEqual(kinds(`you${at}example.com and /Us` + "ers/you"), []);
  assert.deepEqual(kinds("Your Notion CoS Log id goes in settings."), []);
});

test("deny-list terms match whole words, exact case unless the term is lowercase", () => {
  const terms = ["Quill", "acmewidgets"];
  assert.deepEqual(kinds("Ask Quill about it", { terms }), ["denylist"]);
  assert.deepEqual(kinds("a quill pen", { terms }), [], "a capitalized name does not match the ordinary word");
  assert.deepEqual(kinds("ACMEWIDGETS store", { terms }), ["denylist"], "a lowercase brand matches any case");
  assert.deepEqual(kinds("Quillfeather", { terms }), [], "whole words only");
  assert.ok(termPattern("a.b").test("a.b") && !termPattern("a.b").test("axb"));
});
