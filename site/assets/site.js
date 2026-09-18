(() => {
  const menu = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#navigation");
  const closeMenu = () => {
    navigation.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
  };
  menu?.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    navigation.classList.toggle("open", open);
  });
  navigation?.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      menu?.getAttribute("aria-expanded") === "true"
    ) {
      closeMenu();
      menu.focus();
    }
  });
  let toastTimer;
  const notify = (message) => {
    const toast = document.querySelector(".toast");
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 3500);
  };
  async function copy(text) {
    if (!navigator.clipboard?.writeText)
      throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
  }
  let flow = "send";
  let step = 0;
  const modeTabs = [...document.querySelectorAll("[data-flow]")];
  const steps = [...document.querySelectorAll("[data-step]")];
  const nextLabels = {
    send: ["Set your rules", "See the handoff", "Start over"],
    receive: ["See their view", "See what arrives", "Start over"],
  };
  const renderFlow = () => {
    modeTabs.forEach((tab) => {
      const selected = tab.dataset.flow === flow;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute("aria-controls")).hidden =
        !selected;
    });
    document.querySelectorAll(".demo-stage").forEach((panel) => {
      panel.hidden = Number(panel.dataset.stage) !== step;
    });
    steps.forEach((button) => {
      if (Number(button.dataset.step) === step)
        button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    document.querySelector(".demo-counter").textContent = `0${step + 1} / 03`;
    const next = document.querySelector(".demo-next");
    next.replaceChildren(document.createTextNode(nextLabels[flow][step] + " "));
    const arrow = document.createElement("span");
    arrow.textContent = "→";
    arrow.setAttribute("aria-hidden", "true");
    next.append(arrow);
  };
  modeTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      flow = tab.dataset.flow;
      step = 0;
      renderFlow();
    });
    tab.addEventListener("keydown", (event) => {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const next =
          event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
        modeTabs[next].click();
        modeTabs[next].focus();
      }
    });
  });
  steps.forEach((button) =>
    button.addEventListener("click", () => {
      step = Number(button.dataset.step);
      renderFlow();
    }),
  );
  document.querySelector(".demo-next")?.addEventListener("click", () => {
    step = (step + 1) % 3;
    renderFlow();
  });
  document.querySelectorAll("[data-copy]").forEach((button) =>
    button.addEventListener("click", async () => {
      try {
        await copy(button.dataset.copy);
        notify("Example link copied. This is not a live share.");
      } catch {
        notify("Copy unavailable. Example: " + button.dataset.copy);
      }
    }),
  );
  document
    .querySelectorAll(".docs-content pre, .install-command")
    .forEach((pre) => {
      const code = pre.querySelector("code");
      if (!code) return;
      const button = document.createElement("button");
      button.className = "copy-code";
      button.textContent = "Copy";
      button.setAttribute("aria-label", "Copy code block");
      button.addEventListener("click", async () => {
        try {
          await copy(code.textContent);
          button.textContent = "Copied";
          notify("Copied to clipboard");
          setTimeout(() => (button.textContent = "Copy"), 2200);
        } catch {
          const range = document.createRange();
          range.selectNodeContents(code);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          notify("Code selected. Press Ctrl+C or Command+C to copy.");
        }
      });
      pre.append(button);
    });
  const sections = [...document.querySelectorAll(".docs-content section[id]")];
  const search = document.querySelector("#docs-search");
  const filterDocs = () => {
    const query = search.value.trim().toLowerCase();
    let count = 0;
    sections.forEach((section) => {
      const match = !query || section.textContent.toLowerCase().includes(query);
      section.hidden = !match;
      const link = document.querySelector(
        `.docs-sidebar a[href="#${section.id}"]`,
      );
      if (link) link.hidden = !match;
      if (match) count++;
    });
    document.querySelector(".search-status").textContent = query
      ? `${count} matching topic${count === 1 ? "" : "s"}`
      : "";
    document.querySelector(".docs-empty").hidden = count !== 0;
  };
  search?.addEventListener("input", filterDocs);
  search?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      search.value = "";
      filterDocs();
    }
    if (event.key === "Enter") {
      const first = sections.find((section) => !section.hidden);
      if (first) {
        first.scrollIntoView();
        first.tabIndex = -1;
        first.focus({ preventScroll: true });
      }
    }
  });
  // Direct chapter links must remain usable even when a search filter is active.
  document.querySelectorAll('a[href^="#"]').forEach((link) =>
    link.addEventListener("click", () => {
      if (search?.value) {
        search.value = "";
        filterDocs();
      }
    }),
  );
  if (sections.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            document
              .querySelectorAll(".docs-sidebar nav a")
              .forEach((link) =>
                link.classList.toggle(
                  "active",
                  link.hash === "#" + entry.target.id,
                ),
              );
        });
      },
      { rootMargin: "-10% 0px -65% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
  }
})();
