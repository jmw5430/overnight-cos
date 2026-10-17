#!/usr/bin/env node
// The one file that makes Overnight CoS yours: setup/overnight-cos.json in your workspace.
// Every skill reads it; no skill holds an id, a channel or a name of its own.
//
//   settings.mjs path              where the file lives for the workspace you are in
//   settings.mjs check [file]      exit 0 when it is complete, 1 with each problem listed
//   settings.mjs get <dotted.key>  print one value (for a scheduled job's prompt)
import { realpathSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const settingsPath = (root = process.cwd()) => join(root, "setup", "overnight-cos.json");

const has = (v) => typeof v === "string" && v.trim().length > 0;
const isCollection = (v) => /^collection:\/\/[0-9a-f-]{32,36}$/.test(v || "");
const isPageId = (v) => /^[0-9a-f]{32}$|^[0-9a-f-]{36}$/.test(v || "");
const isTime = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v || "");

/** Every problem with a settings object, as plain sentences. Empty means ready. */
export function problems(s = {}) {
  const out = [];
  if (s.version !== 1) out.push("version: must be 1");
  if (!has(s.operator?.firstName)) out.push("operator.firstName: the name cards and drafts use for you");
  if (!has(s.operator?.timezone) || !s.operator.timezone.includes("/")) out.push("operator.timezone: an IANA zone like America/New_York");
  if (!isCollection(s.notion?.cosLog)) out.push("notion.cosLog: the collection:// url of your CoS Log (setup creates it)");
  if (!isCollection(s.notion?.tasks)) out.push("notion.tasks: the collection:// url of the tasks list proposed tasks go into");
  if (!isPageId(s.notion?.briefsParent)) out.push("notion.briefsParent: the page each night's brief is filed under");
  if (!isPageId(s.notion?.rulesPage)) out.push("notion.rulesPage: the CoS rules page (your standing never-flag list)");
  if (!has(s.gmail?.account) || !s.gmail.account.includes("@")) out.push("gmail.account: the Gmail account the sweep reads and drafts in");
  if (s.slack?.enabled && !/^[UW][0-9A-Z]{6,}$/.test(s.slack?.userId || "")) out.push("slack.userId: your Slack member id, needed when slack.enabled is true");
  if (!Array.isArray(s.calendars)) out.push("calendars: a list of calendar ids to read for busy and free (empty is allowed)");
  if (!has(s.focus)) out.push("focus: one line on what this covers, e.g. \"my work at the studio\"");
  for (const k of ["sweep", "drafts"]) if (!isTime(s.schedule?.[k])) out.push(`schedule.${k}: a 24-hour time like 21:00`);
  if (!Array.isArray(s.neverFlag)) out.push("neverFlag: a list (empty is fine) of things the sweep should never raise");
  if (!Array.isArray(s.keyPeople)) out.push("keyPeople: a list (empty is fine) of {name, why}");
  return out;
}

export function load(root = process.cwd()) {
  const p = settingsPath(root);
  if (!existsSync(p)) throw new Error(`no settings at ${p}; run the set-up-overnight-cos skill first`);
  return JSON.parse(readFileSync(p, "utf8"));
}

// Compare real paths: macOS aliases /var to /private/var, and a string compare of URLs then
// silently skips the CLI, which reads as a clean run.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === "path") { console.log(settingsPath()); process.exit(0); }
  if (cmd === "check") {
    const s = arg ? JSON.parse(readFileSync(arg, "utf8")) : load();
    const bad = problems(s);
    if (!bad.length) { console.log("ready"); process.exit(0); }
    console.log(bad.map((b) => `- ${b}`).join("\n")); process.exit(1);
  }
  if (cmd === "get") {
    const v = arg.split(".").reduce((o, k) => (o == null ? o : o[k]), load());
    console.log(typeof v === "string" ? v : JSON.stringify(v)); process.exit(v === undefined ? 1 : 0);
  }
  console.error("usage: settings.mjs path | check [file] | get <dotted.key>"); process.exit(2);
}
