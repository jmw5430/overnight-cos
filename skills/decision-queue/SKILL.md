---
name: decision-queue
description: "The operator's phone decision queue for the nightly sweep. Turns unanswered CoS Log rows into one-tap cards on Supersuit's Next Steps Queue page, then writes each tap back to Notion (the Response column, the Proposed checkbox, the CoS rules page). Use when morning-drafts reaches its decision queue step, when the hourly apply job fires, or when the operator says \"my decisions\", \"apply my taps\", \"triage the cos\". Never sends anything."
---

# Decision queue

The nightly sweep learns only from the CoS Log's Response column: a Killed row is never raised again,
and a line on the rules page stops a whole kind of item. This makes each row a five-second tap and
carries the tap back.

Settings: `setup/overnight-cos.json` in the operator's workspace. Script, run from the workspace root:
`node <this skill's folder>/scripts/cos-queue.mjs`. It needs Supersuit (it writes to Supersuit's queue).

## Hard rules

1. **Never send, reply, post or forward.** Writes go only to the operator's own Notion and the local queue.
2. **Never delete** a draft or a CoS Log row. The only removal is a proposed task the operator tapped
   "Drop it" on, moved to Notion trash, which keeps it for 30 days.
3. **On a task, touch only the Proposed checkbox**, or trash it on "Drop it".
4. **One write per answer, then `applied`.** A failed write stays pending for the next run. Never mark a
   failed write applied.

## Raise (inside morning-drafts, after the drafts)

1. Query `notion.cosLog` for rows created since yesterday 18:00 with an empty Response. For each build
   `{id, url, item, type, sourceUrl, sourceNote, actionTaken, notes, date, response, taskId, sensitive}`,
   where `taskId` is the page id in the Task relation.
2. **Read each row and write what the operator needs, in their words.** A row with no `headline` and
   `ask` is dropped by the script on purpose. Add:
   - `headline`: what this IS, who wants what, with the date. "Dana wants to confirm the studio tour, Wed
     3/11 at 9:30". Never the sweep's own label.
   - `ask`: the one decision, answerable without opening anything. "Pluma drafted a yes. Send it as
     written?" / "Keep this task, due 3/14?" / "Was this worth flagging?"
   - `recommend` and `why`: the button you would press and one line on why. Check the workspace and the
     operator's sent mail first; something already done gets `recommend: "kill"` and says so.
   - `draftText`: for a drafted reply, the draft body itself, read from Gmail or Slack.
   - Skip rows that only report what the sweep did. If one hides a real decision, card that decision.
   - `sensitive: true` for deals, compensation, HR or health. Keep the headline readable from the Item;
     the card hides only the detail.
   Write the array to a scratch file as `rows.json`.
3. **Backlog, once.** Count empty-Response rows dated before the oldest row in step 1, and pass
   `--backlog-count <n> --backlog-before <that date>`. The script will not raise that card twice.
4. `node <this skill's folder>/scripts/cos-queue.mjs raise rows.json --operator "<operator.firstName>" [--backlog-...]`
5. The queue link for the morning text: Supersuit's standing page store. Run
   `node "$(~/.freedom/bin/freedom-lib .agents/skills/create-or-manage-a-tile-app/scripts/host.mjs)" status`,
   take its `phone:` address, and point it at `judgments/` (in the `#to=` part, `%2F%3Fk%3D` becomes
   `%2Fjudgments%2F%3Fk%3D`). If the store is down, say so in the text instead of sending a dead link.

## Apply (the hourly job)

1. `node <this skill's folder>/scripts/cos-queue.mjs pending`. Empty: stop and say nothing.
2. For each item, do exactly what `write` says:
   - `response`: set the CoS Log row's Response to that value.
   - `notesAppend`: add it as a new line at the end of the row's Notes.
   - `task.action` `uncheck-proposed`: untick Proposed on that task. `trash`: move that task to trash.
   - `rule`: add one bullet to `notion.rulesPage`: `<YYYY-MM-DD> - never flag: <rule>`. If the rule is the
     generic `Like: "..."` form, rewrite it as the general kind in one clause, keeping the operator's own
     words when they gave any.
   - `backlog`: set Response to Deferred on every empty-Response row dated before `backlog.before`.
3. After an item's writes succeed: `cos-queue.mjs applied <id> --note "<what was written>"`.
4. One line at the end: applied, failed and why. Text the operator only if one card fails two runs in a row.
