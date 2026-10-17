#!/usr/bin/env bash
# Every test in this plugin. DISCOVERED, never enumerated: a hand-written list
# silently drops any suite nobody remembered to add, which cost abu a 22-test
# suite for weeks. The exit status is captured explicitly rather than piped,
# because piping to `tail` masks a non-zero status and reports green over red.
#
# IT DISCOVERS WHAT THE STANDARD ACCEPTS, WHICH IS THREE SHAPES AND NOT ONE.
# The plugin-standard checker counts `*.test.mjs`, `*.test.js` and `test_*.py`
# as evidence that a plugin has tests. A runner globbing only `*.test.mjs`
# would let a plugin write its suite in either of the other two, pass the
# requirement, and have this script run nothing at all -- which is exactly the
# silent-drop failure the paragraph above is about, one layer down.
set -uo pipefail
cd "$(dirname "$0")"

# LOCATE FREEDOM, SO THE CONFORMANCE SUITE CAN ACTUALLY FAIL.
#
# tests/conformance.test.mjs asks whether this plugin still meets the plugin standard,
# and it skips unless FREEDOM_PLUGIN_STANDARD points at the checker. Nothing anywhere used to
# set that, so every stamped plugin shipped a green suite that asserted nothing and passed the
# standard's own `tests` requirement with a file that never ran. Setting it here is what makes
# the assertion load-bearing.
#
# RESOLVED AT RUNTIME, NEVER BAKED IN AT STAMP TIME. A stamped plugin is meant to work on
# somebody else's machine, and an absolute path written at generation time is a path from the
# machine that generated it -- correct for exactly one person, and silently a skip for everyone
# else, which is the failure this block exists to end.
#
# NEWEST WINS, compared numerically. Every install keeps several versions side by side, one
# directory per version under the plugin's own folder, and the standard a plugin is graded
# against has to be the current one. `sort -V` because "9.9.9" sorts after "10.0.0" as a string.
if [ -z "${FREEDOM_PLUGIN_STANDARD:-}" ]; then
  lib_rel=".agents/lib/freedom-plugin-standard.mjs"
  cache="${CLAUDE_PLUGIN_CACHE:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/cache}"
  shopt -s nullglob
  # Two depths: <marketplace>/<plugin>/<version>/ is what a current install looks like, and
  # <marketplace>/<plugin>/ is what an unversioned one looks like. Matching on the library
  # itself rather than on a directory named "freedom" means the test is "does this ship the
  # checker", which is the only property that matters here.
  candidates=( "$cache"/*/*/*/"$lib_rel" "$cache"/*/*/"$lib_rel" )
  shopt -u nullglob
  best="" best_v=""
  # `${candidates[@]+...}` because an EMPTY array is an unbound variable under `set -u` on the
  # bash macOS ships (3.2), so the no-Freedom-installed case -- the one path this whole block
  # has to handle gracefully -- died with "unbound variable" and exit 1 instead of warning and
  # carrying on. Found by the test for that case rather than by reading.
  for lib in ${candidates[@]+"${candidates[@]}"}; do
    [ -f "$lib" ] || continue
    v="${lib%/$lib_rel}"; v="${v##*/}"
    # An unversioned install sorts below every real version rather than being discarded: it is
    # still a working checker, it is just never preferred over one that names its version.
    case "$v" in [0-9]*) ;; *) v="0.0.0" ;; esac
    if [ -z "$best" ] || [ "$(printf '%s\n%s\n' "$best_v" "$v" | sort -V | tail -1)" = "$v" ]; then
      best="$lib"; best_v="$v"
    fi
  done
  if [ -n "$best" ]; then
    export FREEDOM_PLUGIN_STANDARD="$best"
  else
    # LOUD, ON STDERR, IN WORDS. A plugin whose owner never installs Freedom must still be able to
    # run its own suite green, so this is not an error. But a skipped conformance test is a TAP
    # comment inside a wall of passing output, and a green run that checked nothing reads
    # exactly like a green run that checked everything. Saying which is the whole difference.
    echo "WARNING: Freedom is not installed here, so the conformance test did not verify anything." >&2
    echo "WARNING: This run did NOT check that this plugin still meets the plugin standard." >&2
    echo "WARNING: Install Freedom, or set FREEDOM_PLUGIN_STANDARD to its freedom-plugin-standard.mjs." >&2
  fi
fi

fail=0
found=0
while IFS= read -r f; do
  found=$((found+1))
  case "$f" in
    *.test.mjs|*.test.js) node --test "$f" || fail=1 ;;
    *) python3 "$f" || fail=1 ;;
  esac
done < <(find . \( -name '*.test.mjs' -o -name '*.test.js' -o -name 'test_*.py' \) \
           -not -path './node_modules/*' | sort)
# Zero suites is a broken runner, never a pass. A plugin that has deleted its
# last test should say so out loud rather than reporting green over nothing.
if [ "$found" -eq 0 ]; then
  echo "no test files found; the standard requires this plugin to carry tests" >&2
  exit 1
fi
exit "$fail"
