---
name: nightly-sweep
description: "The evening chief-of-staff pass. Reads the last 24 hours of Gmail, Slack, Notion and calendars, finds every reply the operator owes, proposes tasks, lists open promises and the week ahead, logs each item to the CoS Log and files a dated brief. Never drafts, never sends. Use when the nightly sweep scheduled job fires, or when the operator says \"run the sweep\", \"run my cos\", \"what did I miss today\"."
---

# Nightly sweep

Everything this pass knows about the operator comes from one file:
`setup/overnight-cos.json` in their workspace (check it with
`node <this plugin>/skills/set-up-overnight-cos/scripts/settings.mjs check`). If the check fails, stop and
say which lines are missing. Never guess an id, a channel or a person.

Call them by `operator.firstName`. Scope is `focus`; anything outside it is out of scope.

## Hard rules

1. **Propose, never commit.** A task is created in `notion.tasks` with Status "Not started" and the
   Proposed checkbox ticked. Never set another status, never mark anything done, never edit an
   existing task except to append a note.
2. **Never draft, never send.** The morning-drafts pass writes replies at `schedule.drafts`, where it can
   read the operator's voice and calendars. For each reply owed, log one CoS Log row: Type Draft,
   Action taken "Reply needed", Source the thread or message link, and Notes in this shape, one per line:
   `channel: gmail` (or `channel: slack <channel id>`), `to: <name> <address>`, `msg: <message id>` (or
   `ts: <slack ts>`), `ask: <their question, quoted>`, `context: <up to five lines, each with its source>`,
   `decision: none` or `decision: <what the operator has to decide first>`.
3. **Every line names its source**: channel and author, thread subject and sender, or the Notion page.
   A finding with no source is deleted, not softened.
4. **Standing kills come first.** Before proposing anything, read `notion.rulesPage`. Each bullet is a
   kind of item the operator told you never to flag. Skip anything that matches, and count the skips in
   the brief. Also read the CoS Log's last 14 days: a row whose Response is Killed is never raised again;
   an open row with no response is raised once more as "still open, flagged N days ago" and then dropped
   unless something changed.
5. **`neverFlag` and `gmail.skipSenders` are skipped silently.** `keyPeople` always get read in full.
6. **Times in `operator.timezone`.** No em dashes in the brief.
7. **A direct question to the operator, or a promise they made, is never a watch-list item.** Questions
   get a reply-needed row; promises go under Open promises.
8. **A source that fails is said out loud** in the brief's first section ("Slack search failed; Slack is
   not in tonight's brief"), and the sweep carries on.
9. **Sensitive items** (deals, compensation, HR, health) are named plainly in the brief, which only the
   operator reads, but the CoS Log row and any task name hold a pointer only.
10. **Bookkeeping is not an item.** Do not log a row that only says what the sweep did ("checked
    meetings", "calendar reviewed"). Log the specific thing inside it that needs the operator, or nothing.

## The sweep (run the sources in parallel)

- **Gmail** (`gmail.account`): threads from the last 24 hours whose last message is not from the
  operator, from a real person, minus `skipSenders`. Plus starred threads, with their age. For each:
  does the operator owe a reply? What is the ask, quoted?
- **Slack** (only when `slack.enabled`): messages in the window that mention `slack.userId`, DMs to them,
  and unanswered questions in threads they are in, minus `skipChannels`. Use message search with date
  filters rather than reading channels one by one.
- **Notion**: tasks in `notion.tasks` edited in the window, due within 3 days, or overdue; and meeting
  notes or pages edited in the window with action items that have no task yet.
- **Calendars** (each id in `calendars`): the next 7 days. Collisions, back-to-backs with no gap,
  invites with no answer.
- **Promises**: anything in the window where the operator said they would do something ("I'll send",
  "let me check", "will get back to you"), with the date and the person.

## Write

1. Proposed tasks into `notion.tasks` (rule 1), each with a Source link.
2. One CoS Log row per item in `notion.cosLog`: Item (a plain one-line description), Date, Type (Task,
   Draft, Flag or Situation), Source, Source note, Action taken, Notes, and the Task relation where a task
   was created. Leave Response empty; that column is the operator's.
3. The brief: a page under `notion.briefsParent` titled `CoS Brief YYYY-MM-DD`, sections in this order:
   Today and this week, Replies owed (drafted at <schedule.drafts>), Proposed tasks, Your open promises,
   Situation reads, Watch list, Sources that failed, Skipped by your rules (one count line). Empty sections
   say "Nothing".
4. Nothing else. No message to anyone; the morning pass texts the operator.

## Before you finish

- Rules page read; skips counted.
- Every source ran, or its failure is the brief's first line.
- Every row and every task has a Source.
- No direct question or promise is sitting in the watch list.
- Nothing was sent.
