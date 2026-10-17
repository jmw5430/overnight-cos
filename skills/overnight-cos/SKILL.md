---
name: overnight-cos
description: THE FRONT DOOR for Overnight CoS. Hand it nothing and it says where the operator's overnight chief of staff stands (set up or not, last night's brief, decisions waiting, any job that failed) and the one next move. Hand it plain language ("set it up", "what did it find", "it didn't run", "change my times") and it routes to the right skill. Use when someone says "overnight cos", "my cos", "chief of staff status", or opens a session about it cold.
---

# Overnight CoS

The front door. Somebody types the name and nothing else; this is what comes back.

## The one hard rule

**Never show the operator a shell command.** You run things and report in plain sentences.
The only exceptions are what the harness truly cannot do for them: signing in to Tailscale on
their phone, turning on HTTPS certificates in the Tailscale console, pressing "Run now" on a
scheduled job.

## Procedure

1. **Settings.** Run the `set-up-overnight-cos` skill's `settings.mjs check` from their workspace.
   Missing or incomplete: say so in one line and offer to run setup. That is the whole answer.
2. **The jobs.** List scheduled tasks and find the three this plugin made (nightly sweep, morning
   drafts, apply decisions). Report each one's last run and whether it succeeded. A failure leads
   the answer, with its error in plain words and the fix (a sleeping Mac on battery is the common
   one: leave it on the charger overnight).
3. **Last night.** The newest page under `notion.briefsParent`: its date and the one most
   important item in it.
4. **Decisions.** How many cards are open in the queue, and the link (the `decision-queue` skill
   says how to build it). Zero is good news; say it plainly.
5. **One next move**, chosen from what you found, never a menu.

## Routing

| They say | Go to |
|---|---|
| "set it up", "change my settings", "add Slack", "change my times" | `set-up-overnight-cos` |
| "run the sweep", "what did I miss" | `nightly-sweep` |
| "draft my replies", "redo that draft" | `morning-drafts` |
| "my decisions", "apply my taps" | `decision-queue` |
| "ship it", "release the plugin" (the maintainer) | `ship` |
