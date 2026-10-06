import assert from "node:assert/strict";
import { test } from "node:test";

import { mayReadShare, type Caller } from "./access";

const group = { id: "g1", name: "Finance" };
const open = { creatorId: "owner", groupId: null, group: null };
const limited = { creatorId: "owner", groupId: "g1", group };

const caller = (userId: string, groupIds: string[] = [], isAdmin = false): Caller => ({
  userId,
  isAdmin,
  groupIds: new Set(groupIds),
});

test("a share without a group is open to everybody, signed in or not", () => {
  assert.deepEqual(mayReadShare(open, null), { allowed: true });
  assert.deepEqual(mayReadShare(open, caller("x")), { allowed: true });
});

test("a signed out visitor of a group share is asked to sign in and learns nothing else", () => {
  assert.deepEqual(mayReadShare(limited, null), { allowed: false, reason: "sign-in" });
});

test("a member, the owner and an administrator may read a group share", () => {
  assert.deepEqual(mayReadShare(limited, caller("anita", ["g1"])), { allowed: true });
  assert.deepEqual(mayReadShare(limited, caller("owner")), { allowed: true });
  assert.deepEqual(mayReadShare(limited, caller("boss", [], true)), { allowed: true });
});

test("a signed in non member only learns the name of the group", () => {
  assert.deepEqual(mayReadShare(limited, caller("eve", ["other"])), {
    allowed: false,
    reason: "not-member",
    groupName: "Finance",
  });
});

test("a share whose maker is gone is not opened by the empty id of a visitor", () => {
  const orphan = { creatorId: null, groupId: "g1", group };
  assert.equal(mayReadShare(orphan, caller("eve")).allowed, false);
});
