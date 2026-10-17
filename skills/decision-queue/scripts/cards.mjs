// Pure mapping between CoS Log rows, Next Steps Queue cards, and the Notion writes an answer needs.
// No I/O here: cos-queue.mjs does the store, the scheduled session does Notion.
//
// A row only becomes a card once the raising session has READ it and added, in the operator's words:
//   headline   what this is, one line ("Dana wants to confirm the studio tour, Wed 3/11 at 9:30")
//   ask        the one decision ("Pluma drafted a yes. Send it as written?")
//   recommend  the button Pluma would press, and why (one line, from what the workspace knows)
//   draftText  for a Draft row, the draft itself
// Earned on the first real run: carding the sweep's own labels ("Meetings pass", "sensitive
// item (open the row)") with a generic question got the answer "not sure what this is".

const APPLY = "overnight-cos decision-queue (the hourly apply job writes it to Notion)";
const NEVER = "a CoS Log row is settled only by the operator's answer; nothing on disk can show it";
const SKILL = "your morning CoS";

function buttons(who) {
  const b = {
    Draft: [
      { id: "fine", label: `Good, ${who} sends it`, description: `Pluma marks it done. The draft waits in ${who}'s Drafts for them to send.`, response: "Accepted" },
      { id: "mine", label: `${who} handles it`, description: "Pluma stops drafting this one. The draft is left alone.", response: "Killed", note: "operator: handling it" },
      { id: "stop", label: `Not ${who}'s, stop flagging these`, description: "Pluma tells the nightly sweep to skip this kind of thing from now on.", response: "Killed", stop: true },
      { id: "later", label: "Later", description: "Pluma leaves it for another day.", response: "Deferred" },
    ],
    Task: [
      { id: "accept", label: "Keep the task", description: "Pluma makes it a real task in the Notion tasks list.", response: "Accepted", task: "uncheck-proposed" },
      { id: "kill", label: "Drop it", description: "Pluma moves the proposed task to Notion trash (recoverable for 30 days).", response: "Killed", task: "trash" },
      { id: "later", label: "Later", description: "Pluma leaves it proposed.", response: "Deferred" },
    ],
    Flag: [
      { id: "useful", label: "Useful", description: "Pluma notes it was worth raising.", response: "Accepted" },
      { id: "notuseful", label: "Not useful", description: "Pluma never raises this item again.", response: "Killed" },
      { id: "stop", label: "Stop flagging these", description: "Pluma tells the nightly sweep to skip this kind of thing from now on.", response: "Killed", stop: true },
    ],
  };
  b.Situation = b.Flag;
  return b;
}
const buttonsFor = (type, who) => buttons(who)[type];
const DEFAULT = { Draft: "fine", Task: "accept", Flag: "useful", Situation: "useful" };
const ORDER = { Draft: 0, Task: 1, Flag: 2, Situation: 3 };

const has = (v) => typeof v === "string" && v.trim().length > 0;
const TYPES = new Set(["Draft", "Task", "Flag", "Situation"]);
const cardable = (r) => r && TYPES.has(r.type) && !r.response && has(r.headline) && has(r.ask);

/** True for every card this skill raised, including the first run's (skill name differed). */
export const isCos = (c) => typeof c?.key === "string" && c.key.startsWith("cos:");

/** The rows that get cards, most actionable first, at most `room` of them. */
export function pickRows(rows, room) {
  return rows.filter(cardable)
    .sort((a, b) => ORDER[a.type] - ORDER[b.type] || String(a.date).localeCompare(String(b.date)))
    .slice(0, Math.max(0, room));
}

function field(notes, name) {
  const m = String(notes || "").match(new RegExp(`^${name}:\\s*(.+)$`, "m"));
  return m ? m[1].trim() : null;
}

/** One read CoS Log row to one queue card, or null when there is nothing for the operator to decide. */
export function rowToCard(row, { operator = "You" } = {}) {
  if (!cardable(row)) return null;
  const buttons = buttonsFor(row.type, operator);
  const pick = buttons.some((b) => b.id === row.recommend) ? row.recommend : DEFAULT[row.type];
  const evidence = [];
  if (row.sensitive) {
    evidence.push("Sensitive (deal, comp or HR). Details stay in the brief and the source, not on this card.");
    if (row.sourceUrl) evidence.push(`Source: ${row.sourceUrl}`);
  } else {
    if (has(row.draftText)) evidence.push(`The draft: "${row.draftText.trim()}"`);
    if (has(row.why)) evidence.push(`Pluma's read: ${row.why.trim()}`);
    const ask = field(row.notes, "ask"), decision = field(row.notes, "decision");
    if (ask) evidence.push(`Their ask: ${ask}`);
    if (decision && decision !== "none") evidence.push(`Decide first: ${decision}`);
    if (row.sourceNote) evidence.push(`From: ${row.sourceNote}${row.sourceUrl ? ` (${row.sourceUrl})` : ""}`);
    else if (row.sourceUrl) evidence.push(`Source: ${row.sourceUrl}`);
  }
  return {
    skill: SKILL,
    kind: "decision",
    key: `cos:${row.id}`,
    title: row.headline.trim(),
    question: row.ask.trim(),
    options: buttons.map(({ id, label, description }) => ({ id, label, description, ...(id === pick ? { recommended: true } : {}) })),
    sticky: buttons.map((b) => b.id),
    evidence,
    apply: { cmd: APPLY },
    resolvedWhen: { kind: "never" },
    resolvedWhyNever: NEVER,
    cos: { operator, rowId: row.id, type: row.type, item: row.item, sourceNote: row.sourceNote || null, taskId: row.taskId || null, date: row.date },
  };
}

/** The one-time card that clears the unanswered backlog older than `before`. */
export function backlogCard({ count, before }) {
  return {
    skill: SKILL,
    kind: "cleanup",
    key: `cos:backlog:${before}`,
    title: `${count} old CoS items you never answered`,
    question: `Mark the ${count} unanswered CoS Log items from before ${before} as Deferred, so the sweep's memory starts clean?`,
    options: [
      { id: "defer", label: "Mark them Deferred", description: `Pluma sets them all to Deferred. Nothing else changes.`, recommended: true },
      { id: "leave", label: "Leave them blank", description: "Pluma writes nothing." },
    ],
    sticky: ["defer", "leave"],
    evidence: [`${count} CoS Log items dated before ${before} have no answer yet.`],
    apply: { cmd: APPLY },
    resolvedWhen: { kind: "never" },
    resolvedWhyNever: NEVER,
    cos: { backlogBefore: before },
  };
}

/** What an answered card needs written. */
export function answerToWrite(card) {
  if (card.cos?.backlogBefore) {
    return { backlog: card.answer === "defer" ? { before: card.cos.backlogBefore, response: "Deferred" } : null };
  }
  const text = card.answerText ? String(card.answerText).trim() : null;
  if (card.answer === "other") {
    return { rowId: card.cos.rowId, response: "Deferred", task: null, rule: null, notesAppend: text ? `operator: ${text}` : null };
  }
  const b = buttonsFor(card.cos.type, card.cos.operator || "You").find((x) => x.id === card.answer);
  if (!b) throw new Error(`${card.answer} is not a button on a ${card.cos.type} card`);
  const rule = b.stop ? (text || `Like: "${card.cos.item}"${card.cos.sourceNote ? ` (${card.cos.sourceNote})` : ""}`) : null;
  return {
    rowId: card.cos.rowId,
    response: b.response,
    task: b.task && card.cos.taskId ? { id: card.cos.taskId, action: b.task } : null,
    rule,
    notesAppend: rule ? `class: ${rule}` : (b.note || null),
  };
}
