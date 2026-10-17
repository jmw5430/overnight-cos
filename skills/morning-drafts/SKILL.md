---
name: morning-drafts
description: "The early-morning pass after the nightly sweep. Writes Gmail and Slack drafts for every reply the operator owes, in their own voice, checked against their calendars, then turns last night's CoS Log into one-tap decision cards and texts them the count and the link. Never sends. Use when the morning drafts scheduled job fires, or when the operator says \"draft my replies\", \"morning drafts\", \"redo that draft\"."
---

# Morning drafts

Read `setup/overnight-cos.json` in the operator's workspace first
(`node <this plugin>/skills/set-up-overnight-cos/scripts/settings.mjs check`). Stop and say what is missing
if it fails.

## Hard rules

1. **Draft, never send.** Gmail drafts on the original thread, as a reply to the latest message. Slack
   drafts with the draft tool. Never send, reply, forward or post.
2. **No holding replies.** If the answer depends on a decision the operator has not written down
   anywhere you can read, write no draft. The item becomes a card that asks them the one question.
   "Let me get back to you" is only allowed when the operator already said it themselves.
3. **Never invent.** No fact, number, date, price or commitment that is not in the thread, the
   workspace, or the CoS row's `context:` with a source.
4. **Times come from `calendars`**, read for busy and free only. Offer at most two slots. Never put the
   title of a personal event in a draft, a log or a card.
5. **One draft per thread.** A draft newer than the last incoming message stays. An older one is
   replaced, not duplicated.
6. **The operator's private notes never inform anything sent to another person.**

## For each reply owed

Rows: CoS Log rows since yesterday 18:00 with Type Draft and Action taken "Reply needed". Plus a
safety net: Gmail threads from the last 3 days where the operator is a direct recipient, the last
message is from a real person asking them something, and no row covers it.

1. **Read the whole thread** and quote the actual ask.
2. **Find their decision**, in order: Supersuit project state files, the person's record, recent meeting
   notes, the row's `context:` and `decision:`. Found: draft from it. Not found and the reply needs it:
   rule 2.
3. **Voice.** Read their writing style through Supersuit (`self/voice/`), then their last five sent
   messages to this person (or that domain). Match greeting, length and sign-off. No history: short,
   plain, contractions, no em dashes.
4. **Check it** with Supersuit's style check (`align-to-my-writing-style`, internal surface) and fix
   what it flags.
5. **Save** the draft, then append to the row's Notes: `pluma drafted <date> draft <id>` or
   `pluma: needs <firstName>'s call: <question>`.

## Then the decision queue

Follow the **Raise** section of the `decision-queue` skill. Every unanswered row from last night becomes
a card on the operator's phone, with a plain headline, the real question, your pick and why, and the
draft text for drafts.

## Report

One text to the operator through Supersuit's `message-myself`: how many drafts are ready, how many need
their call (one line each), and "<n> decisions waiting: <queue link>". Nothing drafted and nothing
waiting: send nothing.

## Learning from their edits (start of each run)

For each draft written 1 to 7 days ago, look for the operator's sent message on that thread. If they
changed it, and the change is a pattern rather than a fact fix, add one dated line to
`setup/overnight-cos-voice-lessons.md` in their workspace ("cuts the opening thanks; starts with the
answer"), and read that file in step 3 from then on.
