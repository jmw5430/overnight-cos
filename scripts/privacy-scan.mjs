#!/usr/bin/env node
// Refuses the package if anything in it identifies a real person, account or machine.
//
//   node scripts/privacy-scan.mjs [dir ...] [--denylist <file>] [--require-denylist]
//
// Two layers:
//   1. Generic patterns, always on: email addresses, phone numbers, Notion and Slack ids, UUIDs,
//      tailnet hostnames, home-directory paths. Only example.com-style addresses are allowed.
//   2. A deny list of the maintainer's own people, companies and ids (PRIVACY_DENYLIST or
//      --denylist). It is built outside this repo and never committed, because it is a list of
//      everyone the maintainer knows. --require-denylist (used by the release check) fails when
//      it is missing, so a release can never pass on the generic layer alone.
//
// Exit 0 clean, 1 hits found, 2 misconfigured.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set([".git", "node_modules"]);
const TEXT = /\.(md|mjs|js|cjs|ts|json|jsonl|txt|sh|yml|yaml|html|css|py)$|^[^.]+$/;

// Placeholder ids in examples are zeros with at most a final digit; nothing real looks like that.
const placeholderId = (m) => /^[0-]+[0-9]?$/.test(m);

export const GENERIC = [
  { name: "email", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g, allow: (m) => /@(example\.(com|org|net)|users\.noreply\.github\.com)$/i.test(m) },
  { name: "phone", re: /(?:\+?1[\s.-]?)?\(?\b[2-9]\d{2}\)?[\s.-]\d{3}[\s.-]\d{4}\b|\+\d{10,14}\b/g },
  { name: "uuid", re: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, allow: (m) => placeholderId(m) },
  { name: "notion-id", re: /\b[0-9a-f]{32}\b/g, allow: (m) => placeholderId(m) },
  { name: "slack-id", re: /\b[UCDGW]0[0-9A-Z]{7,10}\b/g },
  { name: "tailnet", re: /\b[\w-]+\.tail[0-9a-f]{4,}\.ts\.net\b/gi },
  { name: "home-path", re: /\/Users\/[A-Za-z0-9._-]+|\/home\/[A-Za-z0-9._-]+/g, allow: (m) => /\/(Users|home)\/(you|me|operator|example)$/.test(m) },
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A deny-list term as a whole-word pattern: lowercase terms match any case, others match exactly. */
export function termPattern(t) {
  const body = escape(t);
  const edge = (c) => (/\w/.test(c) ? "\\b" : "");
  return new RegExp(`${edge(t[0])}${body}${edge(t[t.length - 1])}`, t === t.toLowerCase() ? "gi" : "g");
}

export function scanText(text, { terms = [] } = {}) {
  const hits = [];
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    for (const g of GENERIC) {
      for (const m of line.match(g.re) || []) if (!g.allow?.(m)) hits.push({ line: i + 1, kind: g.name, match: m });
    }
    for (const t of terms) {
      const m = line.match(termPattern(t));
      if (m) hits.push({ line: i + 1, kind: "denylist", match: t });
    }
  });
  return hits;
}

function files(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (SKIP_DIRS.has(n)) continue;
    const p = join(dir, n);
    const s = statSync(p);
    if (s.isDirectory()) files(p, out);
    else if (TEXT.test(n) && s.size < 2_000_000) out.push(p);
  }
  return out;
}

export function loadTerms(path) {
  const d = JSON.parse(readFileSync(path, "utf8"));
  return Array.isArray(d) ? d : d.terms;
}

export function scanDirs(dirs, { terms = [], self = [] } = {}) {
  const out = [];
  for (const dir of dirs) {
    for (const f of files(dir)) {
      if (self.includes(resolve(f))) continue;
      for (const h of scanText(readFileSync(f, "utf8"), { terms })) out.push({ file: relative(process.cwd(), f), ...h });
    }
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
  const dirs = args.filter((a, i) => !a.startsWith("--") && !["--denylist"].includes(args[i - 1]));
  const listPath = flag("--denylist") || process.env.PRIVACY_DENYLIST;
  if (args.includes("--require-denylist") && !(listPath && existsSync(listPath))) {
    console.error("privacy-scan: --require-denylist set and no deny list found (PRIVACY_DENYLIST or --denylist). Refusing to call this clean.");
    process.exit(2);
  }
  // .privacy-allow: deny-list terms this package publishes on purpose (the GitHub owner in the
  // install line), one per line. Committed, reviewed like code, and never a person's name.
  const allowPath = resolve(HERE, "..", ".privacy-allow");
  const allow = new Set(existsSync(allowPath) ? readFileSync(allowPath, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")) : []);
  const terms = (listPath && existsSync(listPath) ? loadTerms(listPath) : []).filter((t) => !allow.has(t));
  // The scanner's own patterns would match themselves; everything else is scanned, tests included.
  const self = [resolve(HERE, "privacy-scan.mjs")];
  const hits = scanDirs(dirs.length ? dirs : [resolve(HERE, "..")], { terms, self });
  for (const h of hits) console.log(`${h.file}:${h.line}  ${h.kind}  ${h.kind === "denylist" ? "(deny-list term)" : h.match}`);
  console.log(`${hits.length ? "REFUSED" : "clean"}: ${hits.length} hit(s), deny list ${terms.length ? `${terms.length} terms` : "NOT loaded"}`);
  process.exit(hits.length ? 1 : 0);
}
