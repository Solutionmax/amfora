import assert from "node:assert/strict";
import { test } from "node:test";

import { BUILTIN_ICONS } from "./builtin-icons";
import { loadIcon } from "./icon-picker-lazy";

test("finds the default provider icons, each through its own pack", async () => {
  // The icons seeded for the built-in providers, including one from each shared prefix (fa6, hi2, io5).
  const names = ["FcGoogle", "FaDiscord", "SiGithub", "SiAuth0", "FaKey", "FaShield", "FaShieldAlt", "FaEgg"];

  for (const name of [...names, "BsFillPSquareFill", "FaCog", "FaXTwitter", "HiMiniKey", "IoLogoGoogle"]) {
    assert.equal(typeof (await loadIcon(name)), "function", name);
  }
});

test("returns null for an unknown name or prefix", async () => {
  assert.equal(await loadIcon("FaDoesNotExist"), null);
  assert.equal(await loadIcon("nonsense"), null);
  assert.equal(await loadIcon(""), null);
});

test("the icons of the default providers ship with the app, drawn as in react-icons", async () => {
  // The icons the server seeds for its built-in providers, plus the fallback cog.
  const seeded = ["FcGoogle", "FaDiscord", "SiGithub", "SiAuth0", "FaKey", "FaShield", "FaShieldAlt", "FaEgg"];

  for (const name of [...seeded, "BsFillPSquareFill", "FaCog"]) {
    const icon = BUILTIN_ICONS[name];

    assert.equal(icon?.tag, "svg", name);
    assert.ok(icon.attr.viewBox, name);
    assert.ok(icon.child?.length, name);
  }
});
