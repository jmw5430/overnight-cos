// Runs the CLI against the real Next Steps Queue library in a throwaway workspace.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB = execFileSync(join(homedir(), ".freedom/bin/freedom-lib"), [".agents/lib/freedom-judgments.mjs"], { encoding: "utf8" }).trim();

function workspace() {
  const root = mkdtempSync(join(tmpdir(), "cos-queue-"));
  writeFileSync(join(root, "AGENTS.md"), "# test workspace\n");
  return root;
}
const run = (root, ...args) => JSON.parse(execFileSync("node", [join(HERE, "cos-queue.mjs"), ...args],
  { encoding: "utf8", env: { ...process.env, COS_QUEUE_ROOT: root, FREEDOM_JUDGMENTS_LIB: LIB } }));

const rows = [
  { id: "r1", url: "https://www.notion.so/r1", item: "Reply to Dana", type: "Draft", actionTaken: "Reply needed", sourceUrl: "https://mail.google.com/a", sourceNote: "Gmail, Dana", notes: "ask: \"when?\"", date: "2026-03-09", response: null, headline: "Dana wants a ship date", ask: "Send the draft?" },
  { id: "r2", url: "https://www.notion.so/r2", item: "Check the order form setting", type: "Task", sourceUrl: "https://x", notes: "", date: "2026-03-09", response: null, taskId: "t2", headline: "Task: check the order form setting", ask: "Keep this task?" },
  { id: "r3", url: "https://www.notion.so/r3", item: "ledger", type: "Ledger", notes: "", date: "2026-03-09", response: null },
];

test("raise, answer, pending, applied: the full round trip", async () => {
  const root = workspace();
  const file = join(root, "rows.json");
  writeFileSync(file, JSON.stringify(rows));

  const first = run(root, "raise", file, "--backlog-count", "263", "--backlog-before", "2026-03-09");
  assert.equal(first.raised.length, 3); // backlog + draft + task, never the ledger row
  assert.equal(first.open, 3);

  const again = run(root, "raise", file, "--backlog-count", "263", "--backlog-before", "2026-03-09");
  assert.equal(again.raised.length, 0, "a row never gets two cards");

  const J = await import(pathToFileURL(LIB).href);
  const task = J.open(root).find((c) => c.key === "cos:r2");
  J.answer(task.id, "kill", { root, via: "page" });

  const pending = run(root, "pending");
  assert.equal(pending.length, 1);
  assert.deepEqual(pending[0].write, { rowId: "r2", response: "Killed", task: { id: "t2", action: "trash" }, rule: null, notesAppend: null });

  run(root, "applied", task.id, "--note", "notion written");
  assert.equal(run(root, "pending").length, 0);

  const third = run(root, "raise", file);
  assert.ok(!third.raised.some((r) => r.key === "cos:r2"), "an answered row never comes back");
});
