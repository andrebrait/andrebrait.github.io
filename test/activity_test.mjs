import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../assets/site.js", import.meta.url), "utf8");
const { describeEvent, formatRelative } = await import(`data:text/javascript,${encodeURIComponent(source)}`);

const event = describeEvent({
  type: "PullRequestEvent",
  repo: { name: "andrebrait/invariant-colors" },
  payload: { action: "closed", number: 42, pull_request: { merged: true, title: "Ship it", html_url: "https://github.com/andrebrait/invariant-colors/pull/42" } }
});

assert.deepEqual(event, {
  action: "Merged a pull request in",
  detail: "Ship it",
  repo: "andrebrait/invariant-colors",
  url: "https://github.com/andrebrait/invariant-colors/pull/42"
});
assert.equal(formatRelative("2026-08-18T10:00:00Z", Date.parse("2026-08-18T12:00:00Z")), "2 hours ago");
