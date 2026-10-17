import { test } from "node:test";
import assert from "node:assert/strict";
const OP = { operator: "Robin" };
import { rowToCard, backlogCard, answerToWrite, pickRows, isCos } from "./cards.mjs";

// What the raising session adds to each CoS Log row before it becomes a card: a plain headline,
// the one decision in the operator's words, Pluma's pick with a reason, and (for drafts) the draft itself.
const draftRow = {
  id: "row-draft-1", url: "https://www.notion.so/row-draft-1", item: "Dana: confirm the studio tour 9:30 Wed 3/11",
  type: "Draft", actionTaken: "Draft saved", sourceUrl: "https://mail.google.com/x", sourceNote: "Gmail, Dana Okafor 3/9",
  notes: "to: Dana Okafor\nask: \"does 9:30 Wed 3/11 still work for the tour?\"", date: "2026-03-09", response: null,
  headline: "Dana wants to confirm the studio tour, Wed 3/11 at 9:30",
  ask: "Pluma drafted a yes. Send it as written?",
  recommend: "fine", why: "It is the time you proposed, and your calendar is clear.",
  draftText: "Hi Dana, 9:30 Wednesday works. See you at the studio. -Robin",
};
const taskRow = { ...draftRow, id: "row-task-1", type: "Task", item: "Send Priya the team chart", draftText: null,
  headline: "Task: send Priya the team chart (due 3/14)", ask: "Keep this task?",
  recommend: "kill", why: "You already sent her the chart on 3/10.", taskId: "task-9" };
const flagRow = { ...draftRow, id: "row-flag-1", type: "Flag", item: "Vendor: Theo asks for a call time", draftText: null,
  headline: "Theo at the print vendor wants a call time", ask: "Was this worth flagging?", recommend: "useful", why: "She asked you directly." };

test("a card leads with the plain headline and the real decision, never the sweep's label", () => {
  const c = rowToCard(draftRow, OP);
  assert.equal(c.title, "Dana wants to confirm the studio tour, Wed 3/11 at 9:30");
  assert.equal(c.question, "Pluma drafted a yes. Send it as written?");
  assert.equal(c.kind, "decision");
  assert.equal(c.skill, "your morning CoS");
  assert.equal(c.key, "cos:row-draft-1");
  assert.ok(isCos(c));
});

test("drafts show the draft first, then Pluma's read, then where it came from", () => {
  const ev = rowToCard(draftRow, OP).evidence;
  assert.equal(ev[0], "The draft: \"Hi Dana, 9:30 Wednesday works. See you at the studio. -Robin\"");
  assert.ok(ev.includes("Pluma's read: It is the time you proposed, and your calendar is clear."));
  assert.ok(ev.includes("Their ask: \"does 9:30 Wed 3/11 still work for the tour?\""));
  assert.ok(ev.some((e) => e.startsWith("From: Gmail, Dana Okafor 3/9")));
});

test("the recommendation is Pluma's pick for this row, not a fixed default", () => {
  const c = rowToCard(taskRow, OP);
  assert.deepEqual(c.options.map((o) => o.id), ["accept", "kill", "later"]);
  assert.equal(c.options.find((o) => o.recommended).id, "kill");
  assert.equal(c.options.filter((o) => o.recommended).length, 1);
  assert.equal(rowToCard({ ...taskRow, recommend: "nonsense" }, OP).options.find((o) => o.recommended).id, "accept");
});

test("button labels say what Pluma will do, by name", () => {
  const labels = rowToCard(draftRow, OP).options.map((o) => o.label);
  assert.deepEqual(labels, ["Good, Robin sends it", "Robin handles it", "Not Robin's, stop flagging these", "Later"]);
  assert.match(rowToCard(taskRow, OP).options.find((o) => o.id === "kill").description, /trash/);
});

test("a row with no decision for the operator never becomes a card", () => {
  assert.equal(rowToCard({ ...flagRow, ask: null }, OP), null, "a flag needs a real ask");
  assert.equal(rowToCard({ ...draftRow, headline: null }, OP), null, "no headline means the raiser did not read it");
  assert.equal(rowToCard({ ...draftRow, type: "Ledger" }, OP), null);
  assert.equal(rowToCard({ ...draftRow, response: "Killed" }, OP), null);
});

test("a sensitive row keeps its safe headline and hides only the detail", () => {
  const c = rowToCard({ ...taskRow, sensitive: true, headline: "Task: prep for Thu 3/12 board call" }, OP);
  assert.equal(c.title, "Task: prep for Thu 3/12 board call");
  assert.ok(c.evidence.some((e) => e.includes("Details stay in the brief")));
  assert.ok(!c.evidence.join(" ").includes("chart on 3/10"), "the why is hidden too");
});

test("pickRows orders drafts, then tasks, then flags, and caps at the room left", () => {
  const rows = [flagRow, taskRow, draftRow, { ...draftRow, type: "Ledger", id: "l" }, { ...flagRow, id: "f2", ask: null }];
  assert.deepEqual(pickRows(rows, 2).map((r) => r.id), ["row-draft-1", "row-task-1"]);
  assert.deepEqual(pickRows(rows, 15).map((r) => r.id), ["row-draft-1", "row-task-1", "row-flag-1"]);
});

test("answers map to the exact Notion writes", () => {
  const ans = (row, a, text = null) => answerToWrite({ ...rowToCard(row, OP), answer: a, answerText: text });
  assert.deepEqual(ans(draftRow, "fine"), { rowId: "row-draft-1", response: "Accepted", task: null, rule: null, notesAppend: null });
  assert.equal(ans(draftRow, "mine").response, "Killed");
  assert.equal(ans(draftRow, "mine").notesAppend, "operator: handling it");
  assert.equal(ans(draftRow, "later").response, "Deferred");
  assert.deepEqual(ans(taskRow, "accept").task, { id: "task-9", action: "uncheck-proposed" });
  assert.deepEqual(ans(taskRow, "kill").task, { id: "task-9", action: "trash" });
  assert.equal(ans(taskRow, "later").task, null);
  assert.equal(ans(flagRow, "notuseful").response, "Killed");
  const stop = ans(flagRow, "stop", "pacing alerts under 10%");
  assert.equal(stop.rule, "pacing alerts under 10%");
  assert.match(stop.notesAppend, /^class: pacing alerts under 10%/);
  assert.match(ans(flagRow, "stop").rule, /Vendor/);
});

test("other carries the operator's words into Notes and defers the row", () => {
  const w = answerToWrite({ ...rowToCard(draftRow, OP), answer: "other", answerText: "ask the client first" });
  assert.equal(w.response, "Deferred");
  assert.equal(w.notesAppend, "operator: ask the client first");
});

test("the backlog card defers every older blank row in one tap", () => {
  const c = backlogCard({ count: 263, before: "2026-03-09" });
  assert.equal(c.key, "cos:backlog:2026-03-09");
  assert.ok(isCos(c));
  assert.equal(c.options.find((o) => o.recommended).id, "defer");
  assert.match(c.question, /263/);
  assert.deepEqual(answerToWrite({ ...c, answer: "defer" }), { backlog: { before: "2026-03-09", response: "Deferred" } });
  assert.deepEqual(answerToWrite({ ...c, answer: "leave" }), { backlog: null });
});
