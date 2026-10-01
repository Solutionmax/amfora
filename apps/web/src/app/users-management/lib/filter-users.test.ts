import assert from "node:assert/strict";
import { test } from "node:test";

import { filterUsers, userCounts } from "./filter-users";

const base = { firstName: "", lastName: "", username: "", email: "", isActive: true, isAdmin: false };
const users = [
  { ...base, firstName: "Raymon", lastName: "Admin", username: "raymon", email: "mail@x.net", isAdmin: true },
  { ...base, firstName: "Anita", lastName: "de Boer", username: "anita", email: "anita@x.net" },
  { ...base, firstName: "Bob", lastName: "Tester", username: "bob", email: "bob@acme.test", isActive: false },
];

test("all returns every user", () => {
  assert.equal(filterUsers(users, "all", "").length, 3);
});

test("active, deactivated and admins tabs", () => {
  assert.deepEqual(
    filterUsers(users, "active", "").map((u) => u.username),
    ["raymon", "anita"]
  );
  assert.deepEqual(
    filterUsers(users, "deactivated", "").map((u) => u.username),
    ["bob"]
  );
  assert.deepEqual(
    filterUsers(users, "admins", "").map((u) => u.username),
    ["raymon"]
  );
});

test("search matches full name, username and email, case-insensitive", () => {
  assert.deepEqual(
    filterUsers(users, "all", "DE BOER").map((u) => u.username),
    ["anita"]
  );
  assert.deepEqual(
    filterUsers(users, "all", "acme").map((u) => u.username),
    ["bob"]
  );
  assert.equal(filterUsers(users, "active", "acme").length, 0);
});

test("does not mutate the input", () => {
  const copy = [...users];
  filterUsers(users, "admins", "r");
  assert.deepEqual(users, copy);
});

test("counts", () => {
  assert.deepEqual(userCounts(users), { total: 3, active: 2, admins: 1 });
});
