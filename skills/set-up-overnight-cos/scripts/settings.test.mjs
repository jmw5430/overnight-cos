import { test } from "node:test";
import assert from "node:assert/strict";
import { problems } from "./settings.mjs";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const example = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../settings.example.json"), "utf8"));

test("the shipped example is complete, so a new operator can copy it", () => {
  assert.deepEqual(problems(example), []);
});

test("an empty file lists every missing piece in plain words", () => {
  const p = problems({});
  assert.ok(p.length >= 12);
  assert.ok(p.some((x) => x.startsWith("notion.cosLog")));
  assert.ok(p.some((x) => x.startsWith("gmail.account")));
});

test("slack is optional, but its id is required once it is on", () => {
  assert.deepEqual(problems({ ...example, slack: { enabled: false } }), []);
  assert.ok(problems({ ...example, slack: { enabled: true } }).some((x) => x.startsWith("slack.userId")));
});

test("times and ids are checked for shape", () => {
  assert.ok(problems({ ...example, schedule: { sweep: "9pm", drafts: "04:00" } }).some((x) => x.startsWith("schedule.sweep")));
  assert.ok(problems({ ...example, notion: { ...example.notion, cosLog: "my log" } }).some((x) => x.startsWith("notion.cosLog")));
});
