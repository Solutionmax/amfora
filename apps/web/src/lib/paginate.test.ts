import assert from "node:assert/strict";
import { test } from "node:test";

import { paginate } from "./paginate";

const items = [1, 2, 3, 4, 5, 6, 7];

test("pages are sliced in order and the last page holds the remainder", () => {
  assert.deepEqual(paginate(items, 1, 5), { items: [1, 2, 3, 4, 5], page: 1, totalPages: 2 });
  assert.deepEqual(paginate(items, 2, 5), { items: [6, 7], page: 2, totalPages: 2 });
});

test("a page outside the list is clamped back into range", () => {
  assert.deepEqual(paginate(items, 9, 5), { items: [6, 7], page: 2, totalPages: 2 });
  assert.deepEqual(paginate(items, 0, 5), { items: [1, 2, 3, 4, 5], page: 1, totalPages: 2 });
  assert.deepEqual(paginate(items, -3, 5), { items: [1, 2, 3, 4, 5], page: 1, totalPages: 2 });
});

test("an empty list still reports one page", () => {
  assert.deepEqual(paginate([], 1, 5), { items: [], page: 1, totalPages: 1 });
});
