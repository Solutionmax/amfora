import assert from "node:assert/strict";
import { test } from "node:test";

import { CreateShareAliasSchema } from "./dto";

const schema = CreateShareAliasSchema.pick({ alias: true });

test("share aliases accept readable hyphenated names just like receive links", () => {
  assert.equal(schema.parse({ alias: "offerte-demo" }).alias, "offerte-demo");
  assert.equal(schema.parse({ alias: "Project2026" }).alias, "Project2026");
});

test("share aliases still reject paths, reserved characters and invalid lengths", () => {
  for (const alias of ["ab", "a".repeat(31), "../secret", "a/b", "a?b", "a#b", "a b", "<script>"]) {
    assert.equal(schema.safeParse({ alias }).success, false, alias);
  }
});
