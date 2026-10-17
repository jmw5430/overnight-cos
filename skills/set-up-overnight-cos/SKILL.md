---
name: set-up-overnight-cos
description: "One-time setup for Overnight CoS: a short interview, then it builds the operator's Notion CoS Log, tasks list, briefs page and rules page, writes setup/overnight-cos.json, connects the phone decision queue over Tailscale, and schedules the nightly sweep, the morning drafts and the hourly apply job. Use when the operator says \"set up overnight cos\", \"set up my nightly cos\", \"install the chief of staff\", or when any Overnight CoS skill says its settings are missing. Safe to run again: it changes only what the operator chooses to change."
---

# Set up Overnight CoS

About 15 minutes, most of it the operator's choices. Everything personal they give you goes into their
own workspace and their own Notion, never into this plugin.

Run from the operator's Supersuit workspace root. Settings land in `setup/overnight-cos.json`
(`node <this skill's folder>/scripts/settings.mjs path`). If the file exists, read it and offer to change
only the parts they name.

## 1. Check what is connected (no questions yet)

- **Supersuit**: `~/.freedom/bin/freedom-lib` exists. Without it, stop: the phone queue, texts to the
  operator and the voice check all come from Supersuit. Point them at installing it.
- **Notion** (required): read the connected user.
- **Gmail** (required): search one recent thread. Note every connected account.
- **Slack** (optional): read their own profile; that gives the member id.
- **Google Calendar** (optional): list calendars.

Say in one line what is connected and what is not. A missing optional source is fine; the sweep says
so in each brief. A missing required one stops setup, with the connector to add.

## 2. The interview

Use `AskUserQuestion`, a few boards, never a wall of questions. Pick defaults from what you just read.

1. **What should the CoS cover?** One line, their words ("my work at the studio"). Becomes `focus`.
2. **Which Gmail account?** Only if more than one is connected.
3. **Slack on?** Yes when it is connected, unless they say no.
4. **Which calendars?** A multi-select of what the list showed. Busy and free only, never titles.
5. **Up to five key people**: whose messages always get read in full. Name and one line on why.
6. **What should it never raise?** Kinds of things, like "vendor marketing emails" or "the weekly
   newsletter from the board". Becomes `neverFlag`. Empty is fine; they can teach it from the phone later.
7. **When?** Defaults: sweep at 21:00, drafts at 04:00, apply hourly 8am to 6pm on weekdays. Their
   timezone comes from the Mac (`date +%Z` and the system setting); confirm it.
8. **Where in Notion?** Default: a new private page called "Overnight CoS". If they already keep tasks
   in a Notion database, offer to use it, provided it has (or can get) a Proposed checkbox and a
   Source url.

## 3. Build their Notion pieces

Under the page from question 8:

- **CoS Log** database: Item (title), Date (date), Type (select: Task, Draft, Flag, Situation),
  Source (url), Source note (text), Action taken (text), Response (select: Accepted, Killed, Edited,
  Deferred), Notes (text), Task (relation to the tasks list).
- **Tasks** database (unless they chose their own): Name (title), Status (Not started, In progress,
  Done), Priority (High, Medium, Low), Due (date), Proposed (checkbox), Source (url).
- **CoS Briefs** page: each night's brief is filed under it.
- **CoS rules** page: one line saying it holds standing "never flag" rules, written from the phone.

Fetch each new database and take its `collection://` url. Write `setup/overnight-cos.json` with
everything gathered (start from `settings.example.json` beside this file), then
`node <this skill's folder>/scripts/settings.mjs check` until it prints `ready`. Commit the file in
their workspace by path.

## 4. The phone

The queue lives on Supersuit's page store, reached over their own Tailscale. Follow Supersuit's
`set-up-tile-apps` skill; it runs a check and names the next step. There are two things only the
operator can do, and they need to be told exactly where to tap:

1. **Tailscale on the Mac and the phone, signed in to the same account.**
2. **HTTPS Certificates turned on**: Tailscale admin console, DNS, HTTPS Certificates, Enable. It is off
   on a new account, and without it nothing reaches the phone.

Then install the page store as a background service and mount the queue on it:

```bash
H="$(~/.freedom/bin/freedom-lib .agents/skills/create-or-manage-a-tile-app/scripts/host.mjs)"
node "$H" install
node "$H" add "$(~/.freedom/bin/freedom-lib .agents/skills/answer-my-judgments/scripts/judgments-tile-app.mjs)" --slug judgments --title "Decisions"
launchctl kickstart -k gui/$(id -u)/com.supersuit.frapp-store
node "$H" status
```

Never use a one-shot `--serve` link for the queue: it shuts down after 30 minutes. **Prove it**: text
them the `judgments/` address and have them open it with Wi-Fi off. It is not set up until they say it
opened.

## 5. Schedule the three jobs

Create three scheduled tasks. Each prompt is self-contained, names the workspace path, and says to read
the skill and follow it exactly:

| Job | When | Prompt says |
|---|---|---|
| Nightly sweep | daily at `schedule.sweep` | follow the `nightly-sweep` skill |
| Morning drafts | daily at `schedule.drafts` | follow the `morning-drafts` skill |
| Apply decisions | weekdays, 5 past each hour, 8am to 6pm | follow the Apply section of `decision-queue`; if nothing is pending, stop |

Each prompt also carries the hard limits: never send, reply, post or forward; never delete a draft or a
row; never read the operator's private notes.

**Then tell them to press "Run now" once on each job.** The first run asks to use Notion, Gmail, Slack
and Calendar; approving it then means the 4am run never stops to ask.

## 6. Keep the Mac awake at night

Scheduled jobs only run while the Mac is awake. With the lid closed **on the charger**, it keeps
running; on battery it sleeps and the jobs wait until morning. Tell them once, plainly: leave it
plugged in overnight.

## 7. Finish

Offer to run the sweep now so they see a first brief and their first cards today. Then say what is now
true in three lines: what runs when, where the cards appear, and that "stop flagging these" on any card
teaches the sweep for good.
