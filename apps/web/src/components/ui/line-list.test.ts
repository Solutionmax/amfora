import assert from "node:assert/strict";
import { before, test } from "node:test";
import React, { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let LineRow: typeof import("./line-list").LineRow;

// The component file uses the automatic JSX runtime that Next provides; the plain test runner does not.
before(async () => {
  (globalThis as { React?: unknown }).React = React;
  ({ LineRow } = await import("./line-list"));
});

const row = (sub: string | undefined, ...children: unknown[]) =>
  renderToStaticMarkup(createElement(LineRow, { title: "T", sub, children: children as never }));

const SUB_ID = /<div id="([^"]+)" class="text-\[12\.5px\]/;

test("a button and an input in the row point to the line under the title", () => {
  const html = row("why", createElement("button", { key: "b" }, "Go"), createElement("input", { key: "i" }));
  const id = SUB_ID.exec(html)?.[1];
  assert.ok(id);
  assert.equal(html.split(`aria-describedby="${id}"`).length - 1, 2);
});

test("controls inside a fragment are described too", () => {
  const html = row("why", createElement(Fragment, null, createElement("button", null, "Go")));
  assert.match(html, /<button aria-describedby="[^"]+">Go<\/button>/);
});

test("plain elements such as text, icons and wrappers get no link", () => {
  const html = row("why", createElement("span", { key: "s" }, "x"), createElement("div", { key: "d" }, "y"));
  assert.equal(html.includes("aria-describedby"), false);
});

test("without a line nothing is linked, and the controls stay as they are", () => {
  const html = row(undefined, createElement("button", null, "Go"));
  assert.equal(html.includes("aria-describedby"), false);
  assert.ok(html.includes("<button>Go</button>"));
});

test("an own aria-describedby is kept", () => {
  const html = row("why", createElement("button", { "aria-describedby": "mine" }, "Go"));
  assert.ok(html.includes('aria-describedby="mine"'));
});
