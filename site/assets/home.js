(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const IMG = {"download-stage": "/assets/screenshots/2.3/download-stage.webp?v=2.3h2", "download-workbench": "/assets/screenshots/2.3/download-workbench.webp?v=2.3h2", "download-seal": "/assets/screenshots/2.3/download-seal.webp?v=2.3h2", "upload-stage": "/assets/screenshots/2.3/upload-stage.webp?v=2.3h2", "upload-workbench": "/assets/screenshots/2.3/upload-workbench.webp?v=2.3h2", "upload-seal": "/assets/screenshots/2.3/upload-seal.webp?v=2.3h2", "login-stage": "/assets/screenshots/2.3/login-stage.webp?v=2.3h2", "login-workbench": "/assets/screenshots/2.3/login-workbench.webp?v=2.3h2", "login-seal": "/assets/screenshots/2.3/login-seal.webp?v=2.3h2"};

  // menu on small screens
  const menu = $(".menu-toggle"), nav = $("#navigation");
  const closeMenu = () => { nav.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); };
  menu.addEventListener("click", () => { const open = menu.getAttribute("aria-expanded") !== "true"; menu.setAttribute("aria-expanded", String(open)); nav.classList.toggle("open", open); });
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) closeMenu(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.getAttribute("aria-expanded") === "true") { closeMenu(); menu.focus(); } });

  // header line once the page has moved
  const hdr = $(".hdr"); addEventListener("scroll", () => hdr.classList.toggle("stuck", scrollY > 8), { passive: true });

  // reveal on scroll
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.14 });
  $$(".rv").forEach((el) => io.observe(el));

  // hero: the windows lean towards the pointer, the download count follows the link
  const hand = $("#handoff");
  if (reduce) $(".wire").pauseAnimations?.();
  else {
    hand.addEventListener("pointermove", (e) => { const r = hand.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      $$("[data-tilt]", hand).forEach((w, i) => { w.style.animation = "none"; w.style.opacity = 1; w.style.transition = "transform .5s cubic-bezier(.16,1,.3,1)"; w.style.transform = `rotateX(${(1.5 - y * 4).toFixed(2)}deg) rotateY(${((i ? -5 : 4) + x * 5).toFixed(2)}deg)`; }); });
    const dl = $("#dl"); let n = 3; $("#mv").addEventListener("endEvent", () => { dl.textContent = ++n; dl.animate([{ transform: "scale(1.5)" }, { transform: "none" }], { duration: 500, easing: "ease-out" }); });
  }

  // parallax on the overlapping screens
  const par = $$("[data-par]"); let tick = false;
  const move = () => { tick = false; const vh = innerHeight; par.forEach((el) => { const r = el.parentElement.getBoundingClientRect(); const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh)); el.style.transform = `translateY(${(p * -el.dataset.par).toFixed(1)}px)`; }); };
  if (!reduce) { addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(move); } }, { passive: true }); move(); }

  // themes
  const box = $("#stagebox"), th = $("#th"), pg = $("#pg"); let theme = "stage", page = "download", auto;
  const DESC = { stage: ["Stage", "the message in large type on your colour"], workbench: ["Workbench", "a calm panel beside a clean white card"], seal: ["Seal", "one centred card, best with your own logo"] };
  const paint = () => { const img = new Image(); img.src = IMG[`${page}-${theme}`]; img.className = "top"; img.alt = `${page} page, ${theme} theme`; box.append(img);
    img.addEventListener("animationend", () => { $$("img", box).forEach((o) => o !== img && o.remove()); img.className = ""; });
    if (reduce) { $$("img", box).forEach((o) => o !== img && o.remove()); img.className = ""; }
    $("#capname").textContent = DESC[theme][0]; $("#capdesc").textContent = DESC[theme][1]; };
  const press = (group, v) => $$("button", group).forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === v));
  const order = ["stage", "workbench", "seal"];
  const cycle = () => { clearInterval(auto); if (reduce) return; auto = setInterval(() => { if (document.hidden) return; theme = order[(order.indexOf(theme) + 1) % 3]; press(th, theme); paint(); }, 4500); };
  th.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; theme = b.dataset.v; press(th, theme); paint(); th.classList.remove("auto"); clearInterval(auto); });
  pg.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; page = b.dataset.v; press(pg, page); paint(); });
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { cycle(); o.disconnect(); } }, { threshold: 0.4 }).observe(box);

  // workspace tabs with a dark switch where a dark screen exists
  const tabs = $$("#tabs .tab"), show = $("#show"), mode = $("#mode"), label = $("#showlabel"); let ti = 0, hold = false, tt;
  const PATH = { dashboard: "dashboard", files: "files", shares: "shares", receive: "reverse-shares", customization: "customization", settings: "settings" };
  const pick = (i) => { ti = i; const k = tabs[i].dataset.k; tabs.forEach((t, j) => t.setAttribute("aria-selected", j === i)); $$("img", show).forEach((im) => im.classList.toggle("on", im.dataset.k === k));
    mode.hidden = !tabs[i].dataset.dark; if (mode.hidden) { show.classList.remove("is-dark"); mode.setAttribute("aria-pressed", false); } label.textContent = "share.solutionmax.net/" + PATH[k]; };
  const loop = () => { clearTimeout(tt); tt = setTimeout(() => { if (!hold && !document.hidden && !reduce) pick((ti + 1) % tabs.length); loop(); }, 4200); };
  tabs.forEach((t, i) => t.addEventListener("click", () => { pick(i); hold = true; }));
  mode.addEventListener("click", () => { const on = mode.getAttribute("aria-pressed") !== "true"; mode.setAttribute("aria-pressed", on); show.classList.toggle("is-dark", on); hold = true; });
  loop();

  // typewriters
  const typeInto = (el, speed, done) => { const txt = el.dataset.text; if (reduce) { el.textContent = txt; done?.(); return; } let i = 0; const step = () => { el.textContent = txt.slice(0, ++i); if (i < txt.length) setTimeout(step, speed); else done?.(); }; step(); };
  const once = (el, fn) => new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); fn(); } }, { threshold: 0.4 }).observe(el);
  once($("#term"), () => typeInto($("#apitype"), 14, () => { $("#term .cur").remove(); $("#term .res").classList.add("on"); }));
  once($("#type"), () => typeInto($("#type"), 26, () => $$("#out span").forEach((o, k) => setTimeout(() => o.classList.add("on"), 400 + k * 450))));
  $("#copy").addEventListener("click", async (e) => { try { await navigator.clipboard.writeText($("#type").dataset.text); e.target.textContent = "Copied"; } catch { e.target.textContent = "Select and copy"; } setTimeout(() => (e.target.textContent = "Copy"), 2000); });

  // a code being typed in
  const otp = $$("#otp i"), code = "481926"; let oi = 0;
  if (reduce) otp.forEach((c, i) => (c.textContent = code[i])); else setInterval(() => { if (document.hidden) return; if (oi === 6) { otp.forEach((c) => { c.textContent = ""; c.classList.remove("f"); }); oi = 0; return; } otp[oi].textContent = code[oi]; otp[oi].classList.add("f"); oi++; }, 520);

  // compare
  const cmp = $("#cmp"), range = $("input", cmp); const stop = () => cmp.classList.remove("auto");
  range.addEventListener("input", (e) => { stop(); cmp.style.setProperty("--x", e.target.value + "%"); }); range.addEventListener("pointerdown", stop);
})();
