#!/usr/bin/env node
// The decision queue's door to the Next Steps Queue. Never touches Notion.
//
//   cos-queue.mjs raise <rows.json> [--operator <first name>] [--backlog-count N --backlog-before YYYY-MM-DD]
//   cos-queue.mjs pending            answered cards and the Notion write each needs (JSON)
//   cos-queue.mjs applied <card id> [--note "..."]
//
// rows.json is an array of CoS Log rows: {id, url, item, type, sourceUrl, sourceNote,
// actionTaken, notes, date, response, taskId?, sensitive?}.
// COS_QUEUE_ROOT overrides the workspace root (tests).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rowToCard, backlogCard, answerToWrite, pickRows, isCos } from "./cards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
// The workspace is where the command runs, never where the plugin is installed: the plugin cache
// is replaced on every update, and anything written there is lost.
const ROOT = process.env.COS_QUEUE_ROOT || process.cwd();

function libPath() {
  if (process.env.FREEDOM_JUDGMENTS_LIB) return process.env.FREEDOM_JUDGMENTS_LIB;
  return execFileSync(join(homedir(), ".freedom/bin/freedom-lib"), [".agents/lib/freedom-judgments.mjs"], { encoding: "utf8" }).trim();
}

const flag = (args, name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

async function main([cmd, ...args]) {
  const J = await import(pathToFileURL(libPath()).href);
  const opts = { root: ROOT };

  if (cmd === "raise") {
    const rows = JSON.parse(readFileSync(args[0], "utf8"));
    const out = { raised: [], skipped: [] };
    const count = Number(flag(args, "--backlog-count")), before = flag(args, "--backlog-before");
    if (count > 0 && before) {
      const r = J.raise(backlogCard({ count, before }), opts);
      (r.raised ? out.raised : out.skipped).push({ key: `cos:backlog:${before}`, why: r.why });
    }
    // Most actionable first; raise() itself refuses past the queue's 15-card ceiling.
    for (const row of pickRows(rows, rows.length)) {
      const r = J.raise(rowToCard(row, { operator: flag(args, "--operator") || "You" }), opts);
      if (r.raised) out.raised.push({ key: `cos:${row.id}`, id: r.card.id });
      else out.skipped.push({ key: `cos:${row.id}`, why: r.why });
    }
    out.open = J.open(ROOT).length;
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  if (cmd === "pending") {
    const mine = J.awaitingApply(ROOT).filter((c) => isCos(c));
    console.log(JSON.stringify(mine.map((c) => ({ id: c.id, title: c.title, answer: c.answer, write: answerToWrite(c) })), null, 2));
    return;
  }

  if (cmd === "applied") {
    const done = J.markApplied(args[0], { ...opts, note: flag(args, "--note") });
    console.log(JSON.stringify({ id: done.id, appliedAt: done.appliedAt }));
    return;
  }

  console.error("usage: cos-queue.mjs raise <rows.json> [--backlog-count N --backlog-before DATE] | pending | applied <id> [--note TEXT]");
  process.exit(2);
}

main(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exit(1); });
