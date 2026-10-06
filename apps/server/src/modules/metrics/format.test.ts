import assert from "node:assert/strict";
import { test } from "node:test";

import { formatMetrics } from "./format";

test("a metric is written with its help, its type and one sample per line", () => {
  const text = formatMetrics([
    { name: "amfora_users", help: "Accounts.", samples: [{ labels: { kind: "total" }, value: 3 }] },
    { name: "amfora_database_up", help: "Database answers.", samples: [{ value: 1 }] },
  ]);
  assert.equal(
    text,
    [
      "# HELP amfora_users Accounts.",
      "# TYPE amfora_users gauge",
      'amfora_users{kind="total"} 3',
      "# HELP amfora_database_up Database answers.",
      "# TYPE amfora_database_up gauge",
      "amfora_database_up 1",
      "",
    ].join("\n")
  );
});

test("label values escape backslash, quote and new line", () => {
  const text = formatMetrics([
    { name: "amfora_info", help: "x", samples: [{ labels: { version: 'a\\b"c\nd' }, value: 1 }] },
  ]);
  assert.match(text, /^amfora_info\{version="a\\\\b\\"c\\nd"\} 1$/m);
});

test("help text keeps to one line", () => {
  const text = formatMetrics([{ name: "amfora_x", help: "one\ntwo \\ three", samples: [{ value: 1 }] }]);
  assert.match(text, /^# HELP amfora_x one\\ntwo \\\\ three$/m);
});

test("a metric without samples is left out, and bigint and fractions print as plain numbers", () => {
  const text = formatMetrics([
    { name: "amfora_none", help: "x", samples: [] },
    { name: "amfora_big", help: "x", samples: [{ value: 12345678901n }, { labels: { a: "b" }, value: 0.5 }] },
  ]);
  assert.ok(!text.includes("amfora_none"));
  assert.match(text, /^amfora_big 12345678901$/m);
  assert.match(text, /^amfora_big\{a="b"\} 0\.5$/m);
});

test("a value that is not a finite number is written as 0 rather than breaking the scrape", () => {
  const text = formatMetrics([{ name: "amfora_x", help: "x", samples: [{ value: Number.NaN }] }]);
  assert.match(text, /^amfora_x 0$/m);
});
