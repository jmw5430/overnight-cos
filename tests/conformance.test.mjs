// Does overnight-cos still meet the plugin standard?
//
// The checker is Freedom's to run, not this plugin's to vendor. A copy of it here would be
// stale within a release and would then grade this plugin against a standard nobody else is
// on, so the library is located through the environment and the test SKIPS when it is absent.
// A plugin whose owner never installs Freedom still gets a green suite rather than an import error
// for a file that was never its to carry.
//
// `./run-tests.sh` SETS THAT VARIABLE, by finding the newest installed Freedom at runtime. It
// used to be set by nothing at all, which made this file a green assertion that could never
// fail: the standard's `tests` requirement satisfied by a no-op. Run the suite through the
// runner, not by reaching for `node --test` directly, or this reverts to a skip.
//
// And the skip is LOUD, on stderr. A node:test skip reason is a TAP comment inside a wall of
// passing output, so a suite that verified nothing reads exactly like one that verified
// everything, which is the same no-op wearing a tick.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("this plugin still meets the plugin standard", async (t) => {
  const lib = process.env.FREEDOM_PLUGIN_STANDARD;
  if (!lib) {
    console.error("WARNING: FREEDOM_PLUGIN_STANDARD is not set, so this did not verify anything.");
    console.error("WARNING: overnight-cos was NOT checked against the plugin standard.");
    return t.skip("Freedom is not installed here");
  }
  const { checkPlugin } = await import(lib);
  const { results } = checkPlugin(ROOT);
  const failed = results.filter((r) => !r.pass).map((r) => `${r.id}: ${r.detail}`);
  assert.deepEqual(failed, []);
});
