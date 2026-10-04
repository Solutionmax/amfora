import assert from "node:assert/strict";
import { test } from "node:test";

import {
  actionKey,
  eventLink,
  eventTone,
  groupByDay,
  initials,
  kindOf,
  parseOpening,
  weekChange,
} from "./activity-events";

const at = (year: number, month: number, day: number, hour: number) =>
  new Date(year, month - 1, day, hour).toISOString();

test("groups a newest first list per calendar day and names today and yesterday", () => {
  const now = new Date(2026, 9, 4, 15);
  const events = [
    { id: "a", createdAt: at(2026, 10, 4, 14) },
    { id: "b", createdAt: at(2026, 10, 4, 0) },
    { id: "c", createdAt: at(2026, 10, 3, 23) },
    { id: "d", createdAt: at(2026, 9, 30, 8) },
  ];

  const groups = groupByDay(events, now);

  assert.deepEqual(
    groups.map((group) => [group.key, group.label, group.events.map((event) => event.id)]),
    [
      ["2026-10-04", "today", ["a", "b"]],
      ["2026-10-03", "yesterday", ["c"]],
      ["2026-09-30", "date", ["d"]],
    ]
  );
});

test("yesterday is found across the start of a month, and no events means no groups", () => {
  const groups = groupByDay([{ createdAt: at(2026, 9, 30, 12) }], new Date(2026, 9, 1, 1));

  assert.equal(groups[0].label, "yesterday");
  assert.deepEqual(groupByDay([], new Date()), []);
});

test("week change says plus, minus or same", () => {
  assert.deepEqual(weekChange({ thisWeek: 6, lastWeek: 2 }), { direction: "up", text: "+4" });
  assert.deepEqual(weekChange({ thisWeek: 1, lastWeek: 3 }), { direction: "down", text: "-2" });
  assert.deepEqual(weekChange({ thisWeek: 3, lastWeek: 3 }), { direction: "same", text: "" });
});

test("tone follows the action, unknown actions stay plain", () => {
  assert.equal(eventTone("share.downloaded"), "ok");
  assert.equal(eventTone("share.password_failed"), "warn");
  assert.equal(eventTone("secret.destroyed"), "bad");
  assert.equal(eventTone("account.sign_in_failed"), "bad");
  assert.equal(eventTone("share.created"), "accent");
  assert.equal(eventTone("account.signed_in"), "plain");
  assert.equal(eventTone("something.new"), "plain");
});

test("action names become message keys", () => {
  assert.equal(actionKey("share.password_failed"), "sharePasswordFailed");
  assert.equal(actionKey("account.sign_in_failed"), "accountSignInFailed");
  assert.equal(actionKey("receive.files_received"), "receiveFilesReceived");
});

test("reads the opening of a secret and refuses anything else", () => {
  assert.deepEqual(parseOpening("1/3"), { opening: 1, max: 3 });
  assert.equal(parseOpening("one of three"), null);
  assert.equal(parseOpening(null), null);
});

test("links to the page of the subject, not for accounts or things that are gone", () => {
  assert.equal(eventLink({ kind: "share", action: "share.opened", subjectId: "a b" }), "/shares?id=a%20b");
  assert.equal(
    eventLink({ kind: "receive", action: "receive.files_received", subjectId: "r1" }),
    "/reverse-shares?id=r1"
  );
  assert.equal(eventLink({ kind: "secret", action: "secret.opened", subjectId: "s1" }), "/secrets?id=s1");
  assert.equal(eventLink({ kind: "secret", action: "secret.destroyed", subjectId: "s1" }), null);
  assert.equal(eventLink({ kind: "share", action: "share.deleted", subjectId: "x" }), null);
  assert.equal(eventLink({ kind: "account", action: "account.signed_in", subjectId: null }), null);
});

test("initials take two words at most; the filter all means no kind", () => {
  assert.equal(initials("Raymon Admin"), "RA");
  assert.equal(initials("  mara van der lind "), "MV");
  assert.equal(initials("anita"), "A");
  assert.equal(kindOf("all"), undefined);
  assert.equal(kindOf("secret"), "secret");
});
