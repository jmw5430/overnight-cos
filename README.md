# Overnight CoS

An overnight chief of staff for your Supersuit.

- **9pm:** it reads the day's Gmail, Slack, Notion and calendars, and finds every reply you owe, every
  promise you made and every task hiding in a thread. It logs each one and files a dated brief in Notion.
- **4am:** it drafts those replies in your own voice, checked against your calendars, and leaves them
  in your Drafts.
- **When you wake up:** one text with how many drafts are ready and a link to your decision queue, one
  card per item, each a single tap. Keep the task, drop it, "I'll handle it", or "stop flagging these".
- **Every tap teaches it.** Whatever you drop is never raised again, and "stop flagging these" retires
  a whole kind of item for good. The sweep gets quieter and sharper every week.

**It never sends anything.** Drafts only. You send.

## What you need

- Supersuit, installed and activated on a Mac.
- Notion and Gmail connected to Claude. Slack and Google Calendar are optional but worth it.
- Tailscale on your Mac and your phone, signed in to the same account (free). Setup walks you through it.
- Your Mac plugged in overnight. On the charger with the lid closed is fine; on battery it sleeps and
  nothing runs.

## Install

```bash
claude plugin marketplace add OWNER/overnight-cos
```

```bash
claude plugin install overnight-cos@overnight-cos
```

Then open a session in your Supersuit workspace and say **"set up overnight cos"**. The interview takes
about 15 minutes. It builds your Notion log, asks what to watch and what to ignore, connects your phone,
and schedules the three jobs. Press "Run now" once on each job when it asks, so the 4am run never stops
to ask permission.

## After that

Say **"overnight cos"** any time to hear where it stands: last night's brief, what's waiting for you, and
whether every job ran.

## What stays yours

Everything you tell it lives in your own workspace (`setup/overnight-cos.json`) and your own Notion.
Nothing goes back into the plugin, and the plugin holds no one's names, addresses or ids. Every release
is scanned for them and refused if one is found.
