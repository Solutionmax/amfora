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
  const tabs = [...document.querySelectorAll("[data-view]")];
  const selectView = (tab) => {
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute("aria-controls")).hidden =
        !selected;
    });
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectView(tab));
    tab.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft")
        next = (index + tabs.length - 1) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        selectView(tabs[next]);
        tabs[next].focus();
      }
    });
  });
  let toastTimer;
  const notify = (message) => {
    const toast = document.querySelector(".toast");
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 3500);
  };
  document.querySelectorAll(".docs-content pre").forEach((pre) => {
    const code = pre.querySelector("code");
    if (!code) return;
    const button = document.createElement("button");
    button.className = "copy-code";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code block");
    button.addEventListener("click", async () => {
      try {
        if (!navigator.clipboard?.writeText)
          throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(code.textContent);
        button.textContent = "Copied";
        notify("Copied to clipboard");
        setTimeout(() => {
          button.textContent = "Copy";
        }, 2200);
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
  const sections = document.querySelectorAll(".docs-content section[id]");
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
