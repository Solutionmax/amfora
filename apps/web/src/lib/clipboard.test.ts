import { strict as assert } from "node:assert";
import { test } from "node:test";

import { copyText } from "./clipboard";

type FakeTextarea = {
  value: string;
  style: Record<string, string>;
  setAttribute: () => void;
  focus: (options?: FocusOptions) => void;
  select: () => void;
};

function installBrowser({
  nativeCopy,
  fallbackCopy,
  inDialog = false,
  inMenu = false,
}: {
  nativeCopy?: (text: string) => Promise<void>;
  fallbackCopy: boolean;
  inDialog?: boolean;
  inMenu?: boolean;
}) {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  let appended: FakeTextarea | null = null;

  const textarea: FakeTextarea = {
    value: "",
    style: {},
    setAttribute: () => undefined,
    focus: () => undefined,
    select: () => undefined,
  };
  const body = {
    appendChild: (node: FakeTextarea) => {
      appended = node;
    },
    removeChild: (node: FakeTextarea) => {
      assert.equal(node, appended);
    },
  };
  let appendedToDialog = false;
  let focusRestored = false;
  const dialog = {
    appendChild: (node: FakeTextarea) => {
      appended = node;
      appendedToDialog = true;
    },
    removeChild: (node: FakeTextarea) => {
      assert.equal(node, appended);
    },
  };
  const activeElement = {
    closest: () => (inDialog || inMenu ? dialog : null),
    focus: () => {
      focusRestored = true;
    },
  };

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: nativeCopy ? { clipboard: { writeText: nativeCopy } } : {},
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      body,
      activeElement,
      createElement: () => textarea,
      execCommand: () => fallbackCopy,
    },
  });

  return {
    get textarea() {
      return appended;
    },
    get appendedToDialog() {
      return appendedToDialog;
    },
    get focusRestored() {
      return focusRestored;
    },
    restore() {
      if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
      else delete (globalThis as { navigator?: unknown }).navigator;
      if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
      else delete (globalThis as { document?: unknown }).document;
    },
  };
}

test("copyText uses the native clipboard when available", async () => {
  let copied = "";
  const browser = installBrowser({
    nativeCopy: async (text) => {
      copied = text;
    },
    fallbackCopy: false,
  });

  try {
    await copyText("native value");
    assert.equal(copied, "native value");
    assert.equal(browser.textarea, null);
  } finally {
    browser.restore();
  }
});

test("copyText falls back when native clipboard access fails", async () => {
  const browser = installBrowser({
    nativeCopy: async () => {
      throw new Error("permission denied");
    },
    fallbackCopy: true,
  });

  try {
    await copyText("fallback value");
    assert.equal(browser.textarea?.value, "fallback value");
  } finally {
    browser.restore();
  }
});

test("copyText rejects when both clipboard paths fail", async () => {
  const browser = installBrowser({
    nativeCopy: async () => {
      throw new Error("permission denied");
    },
    fallbackCopy: false,
  });

  try {
    await assert.rejects(copyText("uncopied value"), /Could not copy text/);
  } finally {
    browser.restore();
  }
});

test("copyText keeps the fallback inside a focused dialog and restores focus", async () => {
  const browser = installBrowser({ fallbackCopy: true, inDialog: true });

  try {
    await copyText("dialog value");
    assert.equal(browser.appendedToDialog, true);
    assert.equal(browser.focusRestored, true);
  } finally {
    browser.restore();
  }
});

test("copyText keeps the fallback inside a focused menu and restores focus", async () => {
  const browser = installBrowser({ fallbackCopy: true, inMenu: true });

  try {
    await copyText("menu value");
    assert.equal(browser.appendedToDialog, true);
    assert.equal(browser.focusRestored, true);
  } finally {
    browser.restore();
  }
});
