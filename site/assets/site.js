(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // menu
  const menu = $(".menu-toggle"), nav = $("#navigation");
  const closeMenu = () => { nav?.classList.remove("open"); menu?.setAttribute("aria-expanded", "false"); };
  menu?.addEventListener("click", () => { const open = menu.getAttribute("aria-expanded") !== "true"; menu.setAttribute("aria-expanded", String(open)); nav.classList.toggle("open", open); });
  nav?.addEventListener("click", (e) => { if (e.target.closest("a")) closeMenu(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu?.getAttribute("aria-expanded") === "true") { closeMenu(); menu.focus(); } });
  // toast
  let toastTimer; const toast = $(".toast");
  const notify = (m) => { if (!toast) return; toast.textContent = m; toast.classList.add("on", "visible"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("on", "visible"), 2200); };
  $$("[data-toast]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); notify(b.dataset.toast); }));
  const copy = async (t) => { if (!navigator.clipboard?.writeText) throw new Error("no clipboard"); await navigator.clipboard.writeText(t); };
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => { try { await copy($(b.dataset.copy).textContent); notify("Copied to clipboard"); } catch { notify("Select the text and copy it"); } }));
  $$(".docs-content pre, .install-command").forEach((pre) => { const code = pre.querySelector("code"); if (!code) return; const b = document.createElement("button"); b.className = "copy-code"; b.textContent = "Copy"; b.setAttribute("aria-label", "Copy code block"); b.addEventListener("click", async () => { try { await copy(code.textContent); b.textContent = "Copied"; notify("Copied to clipboard"); setTimeout(() => (b.textContent = "Copy"), 2200); } catch { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); notify("Code selected. Press Ctrl+C or Command+C to copy."); } }); pre.append(b); });
  // docs search
  const search = $("#docs-search"), sections = $$(".docs-content section[id]");
  const filterDocs = () => { const q = search.value.trim().toLowerCase(); let count = 0; sections.forEach((s) => { const m = !q || s.textContent.toLowerCase().includes(q); s.hidden = !m; const l = $(`.docs-sidebar a[href="#${s.id}"]`); if (l) l.hidden = !m; if (m) count++; }); const st = $(".search-status"); if (st) st.textContent = q ? `${count} matching topic${count === 1 ? "" : "s"}` : ""; const e = $(".docs-empty"); if (e) e.hidden = count !== 0; };
  search?.addEventListener("input", filterDocs);
  search?.addEventListener("keydown", (e) => { if (e.key === "Escape") { search.value = ""; filterDocs(); } });
  // homepage motion (every block is optional)
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);const c=e.target.querySelector('[data-count]');if(c){const t=+c.dataset.count;let n=0;const st=Date.now();const tick=()=>{const p=Math.min(1,(Date.now()-st)/1400);n=Math.round(t*(1-Math.pow(1-p,3)));c.textContent=n.toLocaleString('en');if(p<1)requestAnimationFrame(tick)};tick()}}}),{threshold:.15});
  document.querySelectorAll('.rv').forEach(el=>io.observe(el));document.querySelectorAll('.bento .b').forEach((b,i)=>b.style.setProperty('--d',(i*70)+'ms'));
  document.querySelectorAll('.run .stack, .faq > div:last-child, .tile-hero').forEach(el=>io.observe(el));
  // carousel
  const tabs=[...document.querySelectorAll('#tabs .tab')],imgs=[...document.querySelectorAll('#show img')],lab=document.getElementById('showlabel');let ti=0,hold=false,tt2;
  function showI(i){ti=i;tabs.forEach((t,j)=>{t.setAttribute('aria-selected',j===i);if(j===i){const b=t.querySelector('i');b.style.animation='none';b.offsetHeight;b.style.animation=''}});imgs.forEach((im,j)=>im.classList.toggle('on',j===i));lab.textContent='AMFORA / '+tabs[i].querySelector('b').textContent.toUpperCase()}
  function cycle(){clearTimeout(tt2);tt2=setTimeout(()=>{if(!hold&&!document.hidden)showI((ti+1)%tabs.length);cycle()},4000)}
  tabs.forEach(t=>t.addEventListener('click',()=>{showI(+t.dataset.i);hold=true;setTimeout(()=>hold=false,12000);cycle()}));if(tabs.length)cycle();
  // typewriter
  const ty=document.getElementById('type'),out=[...document.querySelectorAll('#out span')];const tio=new IntersectionObserver(es=>{if(!es[0].isIntersecting)return;tio.disconnect();const txt=ty.dataset.text;let i=0;const step=()=>{ty.textContent=txt.slice(0,++i);if(i<txt.length)setTimeout(step,28);else out.forEach((o,k)=>setTimeout(()=>o.classList.add('on'),500+k*450))};if(reduce){ty.textContent=txt;out.forEach(o=>o.classList.add('on'))}else step()},{threshold:.4});if(ty)tio.observe(ty);
  
  document.querySelectorAll('[data-t]').forEach(t=>t.addEventListener('click',()=>t.classList.toggle('on')));
  const mini=document.getElementById('mini');if(mini)document.querySelectorAll('#sw button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#sw button').forEach(x=>x.setAttribute('aria-pressed',x===b));mini.style.setProperty('--p',b.dataset.c)}));
  let ci=0;const cs=[...document.querySelectorAll('#sw button')];if(cs.length)setInterval(()=>{if(document.hidden)return;ci=(ci+1)%cs.length;cs[ci].click()},2600);
  const cmp=document.getElementById('cmp');if(cmp){cmp.querySelector('input').addEventListener('input',e=>{cmp.classList.remove('auto');cmp.style.setProperty('--x',e.target.value+'%')});cmp.querySelector('input').addEventListener('pointerdown',()=>cmp.classList.remove('auto'))}
  const cnt=document.getElementById('cnt');let cn=23;if(cnt)setInterval(()=>{if(!document.hidden){cn++;cnt.textContent=cn}},4000);
})();
