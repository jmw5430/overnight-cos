---
name: ship
description: Release a change to the overnight-cos plugin so it actually reaches everyone who runs it. Runs the tests, bumps the version, commits, pushes, refreshes the marketplace catalog, updates the local install, and verifies against the remote rather than the local disk. Refuses at every step that has silently shipped nothing before. Use after changing anything in this plugin, or when someone says "ship it", "release the plugin", "cut a version", "push the upgrade".
---

# Ship a overnight-cos upgrade

## Two ways in, and the common one is NOT "the work is done"

**Mode A — the upgrade does not exist yet.** Somebody names a thing they want and reaches
for this skill as the front door to the whole arc. This is the ordinary case. **Do not
treat a clean tree as an error.** The release is the last step, not the whole of it:

1. Pin down what it is, and what it REFUSES to do. The refusals are the design.
2. Decide where it belongs. A change to what this plugin runs goes in this plugin;
   anything every Freedom operator would want belongs upstream and ships from there.
   Putting an upstream change in this repo is the most common way an upgrade reaches nobody.
3. Build it, with tests, and break each test on purpose to watch it go red.
4. Then run the steps below.

**Mode B — the work is done.** Run the steps. On a clean tree, say `nothing was shipped`
and name the first step of Mode A, rather than refusing: "make the change first" is true
and a dead end for the person who came to start the change.

**One sharp edge: this releases whatever is in the tree.** Mid-edit on something unrelated
means that ships too. Read the working tree before starting.

## Step zero, once per plugin: the remote, and it is the OPERATOR's

The stamp left a git repository on disk, with `.claude-plugin/marketplace.json` beside the
manifest, and **no remote**. That gap is deliberate and it is the one step of this arc a
machine must not guess at: only the operator knows which account this belongs to, whether it
is private, and what it should be called.

So on the first release, before anything below:

1. **The operator creates the remote** on their own account and adds it as `origin`. Ask for
   it; do not create a repository under whatever account happens to be authenticated here.
   A plugin published to the wrong account is not a mistake anybody can quietly undo.
2. **The operator adds the marketplace from the REMOTE**, never from the local clone. Added
   from a clone, `marketplace.json` resolves to that folder and every future update reports
   "already at the latest version" forever, which is correct and reaches nobody.
3. **Set `owner.name` in `.claude-plugin/marketplace.json`** to the person or organization who
   owns this. The stamp filled it with the plugin's own name, which is a placeholder.

**If there is no remote, stop and say so.** Do not push to somewhere plausible. Everything
below assumes a remote exists and verifies against it; with none, step 4 onward is theatre.

## The order is load-bearing

1. **Run the whole suite.** `./run-tests.sh`, from the plugin root. A red suite stops
   everything; nothing below is worth doing over a broken verb.
1a. **Run the privacy gate.** `node scripts/privacy-scan.mjs --require-denylist`, with
   `PRIVACY_DENYLIST` pointing at the maintainer's own deny list (built outside this repo,
   never committed). Any hit stops the release, and so does a missing list: this plugin is
   shared, so a release that might carry a real name, address or id does not ship at all.
2. **Bump the version in `.claude-plugin/plugin.json`.** Default patch for a fix nobody
   depends on the behaviour of, minor for a new verb, major when a verb's name, arguments
   or output shape changes, because those break whatever calls them.
3. **Commit with explicit paths.** Never `git add -A`: another session may be working the
   same repo, and a bare add sweeps their work into a commit describing none of it.
4. **Push.** The install pulls from the remote, so a commit that has not been pushed is not
   a release. "Committed but not pushed" is the single most common way a fix reaches nobody.
5. **Refresh the marketplace catalog, then update the install, in that order.** The update
   installs whatever the local catalog clone knows about, and only the catalog refresh moves
   that clone. The other way round returns a confident "already at the latest version" from
   a clone pinned at an old commit.
6. **Verify against the REMOTE.** Read the published `plugin.json` back from the remote,
   uncached, and refuse if it is still serving the old version.

## Why every one of those is a step and not a good intention

Each failure mode looks exactly like success at the moment it happens:

| Skipped | What you see | What is true |
|---|---|---|
| Tests | nothing | a broken verb ships and somebody else finds it |
| Version bump | `already at the latest version` | correct, and the change reaches nobody, forever |
| Push | the update runs fine | the update installs from the remote; your commit is on your disk |
| Catalog refresh | `already at the latest version` | the local catalog clone is pinned and lying |
| Verifying locally | the version looks right | you proved your own disk, which was never in doubt |

## Verification is from the server, never the disk

Reading your own working tree proves the one thing nobody doubted. Read the version back
from the remote, then check the version actually installed, because "no error" is not "it
landed".

## The release is not finished until the person who asked for it has been told

Read the commits in this release for `Reported-by:`, `Requested-by:` and `Found-by:`
trailers, and name the people the release is owed to. Show the operator a draft and send
only on their approval; a message that leaves the machine is always theirs to authorise.

**Nobody named is a real answer.** Plenty of releases are nobody's idea but the operator's.
Do not invent a recipient: an inflated thank-you is worth less than none.

**But the commits cannot know what a conversation said.** If this release came out of
something somebody told the operator and no trailer records it, say so, and add the trailer
next time so the next release can see it.

## After it finishes

**Restart the session.** A running session holds the skills it loaded at start, so the
thing just shipped is not yet what is running.
