import assert from "node:assert/strict";
import { test } from "node:test";

import { fontName, normalizeFont, PREDEFINED_FONTS } from "./fonts";

test("a font from the list stays the option it is", () => {
  for (const font of PREDEFINED_FONTS) {
    assert.equal(normalizeFont(font.value), font.value, font.name);
  }
  assert.equal(normalizeFont("var(--font-inter)"), "var(--font-inter), Inter, sans-serif", "the bare variable too");
  assert.equal(normalizeFont("  VAR(--font-Inter), Inter"), "var(--font-inter), Inter, sans-serif");
});

test("a font variable this version does not ship is the default, never a raw name in the list", () => {
  // Versions before 2.3 seeded this as the default; the font itself is gone.
  assert.equal(normalizeFont("var(--font-jakarta)"), "");
  assert.equal(normalizeFont("var(--font-bricolage), serif"), "");
  assert.equal(normalizeFont(""), "");
  assert.equal(normalizeFont(null), "");
  assert.equal(normalizeFont(undefined), "");
});

test("somebody's own font family is kept and gets a readable name", () => {
  assert.equal(normalizeFont("Georgia, serif"), "Georgia, serif");
  assert.equal(normalizeFont("'Atkinson Hyperlegible', sans-serif"), "'Atkinson Hyperlegible', sans-serif");
  assert.equal(fontName("'Atkinson Hyperlegible', sans-serif"), "Atkinson Hyperlegible");
  assert.equal(fontName('"IBM Plex Sans"'), "IBM Plex Sans");
  assert.equal(fontName("Georgia, serif"), "Georgia");
});
