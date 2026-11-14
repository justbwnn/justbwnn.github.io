const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // reveal on scroll — run first so content never stays hidden
  try {
    const els = [...document.querySelectorAll(".reveal")];
    // stagger: anak-anak section ikut muncul berurutan
    els.forEach(sec => [...sec.children].forEach((c, i) => c.style.setProperty("--d", (i * 70) + "ms")));

    const io = new IntersectionObserver(es => es.forEach(e => {
      e.target.classList.toggle("in", e.isIntersecting);
    }), { threshold: .15, rootMargin: "0px 0px -40px 0px" });
    els.forEach(el => io.observe(el));
  } catch {
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("in"));
  }

  try {
  document.getElementById("year").textContent = new Date().getFullYear();

  // theme toggle
  const root = document.documentElement, btn = document.getElementById("theme");
  const apply = t => {
    root.dataset.theme = t;
    btn.textContent = t === "light" ? "☀" : "☾";
    btn.setAttribute("aria-label", t === "light" ? "Aktifkan tema gelap" : "Aktifkan tema terang");
  };
  apply(localStorage.getItem("theme") || "dark");
  btn.addEventListener("click", () => {
    const t = root.dataset.theme === "light" ? "dark" : "light";
    localStorage.setItem("theme", t);
    apply(t);
  });

  // daftar proyek: ambil dari GitHub API supaya selalu sinkron dengan repo asli
  const REPO_API = "https://api.github.com/users/justbwnn/repos?per_page=100&sort=updated";
  const CACHE_KEY = "porto-projects";
  const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 jam
  const SKIP = new Set(["justbwnn.github.io"]); // repo situs ini, bukan proyek

  const LANG_TAG = {
    JavaScript: "web", TypeScript: "web", HTML: "web", CSS: "web", Astro: "web", Vue: "web",
    Python: "python", Jupyter: "python",
    Shell: "tools", PowerShell: "tools", Dockerfile: "tools", Makefile: "tools"
  };

  const projectBox = document.getElementById("projects");
  const filterBox = document.getElementById("filters");
  const projectError = document.getElementById("projectsError");
  const empty = document.getElementById("empty");

  // deskripsi repo berasal dari API luar — escape sebelum masuk HTML
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // terima repo mentah (dari API) maupun snapshot yang sudah dinormalisasi
  const normalize = repos => repos
    .filter(r => !r.fork && !SKIP.has(r.name))
    .map(r => ({
      name: r.name,
      url: r.html_url || r.url,
      home: r.homepage || r.home || "",
      desc: r.description || r.desc || "Tanpa deskripsi.",
      lang: r.language || r.lang || "",
      tag: r.tag || LANG_TAG[r.language] || "lainnya",
      pushed: r.pushed || (r.pushed_at ? new Date(r.pushed_at).getFullYear() : "")
    }));

  const setStat = (key, value) => {
    const el = document.querySelector(`[data-stat="${key}"]`);
    if (el) el.textContent = value;
  };

  const renderProjects = list => {
    if (!list.length) { projectBox.innerHTML = ""; filterBox.hidden = true; empty.hidden = false; return; }

    setStat("projects", list.length);
    setStat("langs", new Set(list.map(p => p.lang).filter(Boolean)).size);
    const tags = [...new Set(list.map(p => p.tag))];
    const LABEL = { web: "Web", python: "Python", tools: "Tools", lainnya: "Lainnya" };
    filterBox.innerHTML =
      `<button type="button" class="filter active" data-tag="all">Semua</button>` +
      tags.map(t => `<button type="button" class="filter" data-tag="${t}">${LABEL[t]}</button>`).join("");
    filterBox.hidden = false;

    projectBox.innerHTML = list.map((p, i) => `
      <article class="project" data-tags="${esc(p.tag)}">
        <span class="project-no" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
        <h3><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a></h3>
        <p>${esc(p.desc)}</p>
        <ul class="tags">${p.lang ? `<li>${esc(p.lang)}</li>` : ""}<li>${esc(p.pushed)}</li></ul>
        <p class="proj-links">
          <a href="${esc(p.url)}" target="_blank" rel="noopener">Source ↗</a>
          ${p.home ? `<a href="${esc(p.home)}" target="_blank" rel="noopener">Demo ↗</a>` : ""}
        </p>
        <i class="proj-bar" aria-hidden="true"></i>
      </article>`).join("");

    // pasang ulang filter (kartu digambar ulang)
    filterBox.querySelectorAll(".filter").forEach(b => b.addEventListener("click", () => {
      filterBox.querySelector(".filter.active")?.classList.remove("active");
      b.classList.add("active");
      const tag = b.dataset.tag;
      let shown = 0;
      projectBox.querySelectorAll(".project").forEach(c => {
        const ok = tag === "all" || c.dataset.tags.split(" ").includes(tag);
        c.hidden = !ok;
        if (ok) shown++;
      });
      empty.hidden = shown > 0;
    }));
  };

  (async () => {
    if (!projectBox) return;
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached && Date.now() - cached.at < CACHE_TTL) {
        renderProjects(cached.list);
        return;
      }
      const res = await fetch(REPO_API, { headers: { Accept: "application/vnd.github+json" } });
      if (!res.ok) throw new Error(res.status);
      const list = normalize(await res.json());
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), list }));
      renderProjects(list);
    } catch {
      // API kena rate limit / offline → pakai snapshot yang tersimpan di repo
      try {
        const snap = await fetch("data/projects.json").then(r => r.json());
        renderProjects(snap.repos);
      } catch {
        projectBox.innerHTML = "";
        filterBox.hidden = true;
        projectError.hidden = false;
      }
    }
  })();

  // scroll progress
  const bar = document.getElementById("progress");
  const nav = document.querySelector(".nav");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty("--p", max > 0 ? scrollY / max : 0);
    nav?.classList.toggle("scrolled", scrollY > 12);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // active nav link
  const links = [...document.querySelectorAll(".nav ul a")];
  try {
    const secIO = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
    }), { rootMargin: "-40% 0px -55% 0px" });
    document.querySelectorAll("section[id]").forEach(s => secIO.observe(s));
  } catch {}

  // copy email (tombol teks + tombol ikon di kartu profil)
  const copyBtns = [...document.querySelectorAll('[data-email][id^="copy"]')];
  copyBtns.forEach(btn => btn.addEventListener("click", async () => {
    const label = btn.getAttribute("aria-label") || btn.textContent.trim();
    const isIcon = !!btn.querySelector("svg");
    const markDone = () => {
      btn.classList.add("done");
      if (isIcon) btn.setAttribute("aria-label", "Email tersalin");
      else btn.textContent = "Tersalin ✓";
      setTimeout(() => {
        btn.classList.remove("done");
        btn.setAttribute("aria-label", label);
        if (!isIcon) btn.textContent = "Salin Email";
      }, 1800);
    };
    try {
      await navigator.clipboard.writeText(btn.dataset.email);
      markDone();
    } catch {
      // fallback tanpa navigator.clipboard: pakai textarea sementara, jangan navigasi keluar
      const ta = document.createElement("textarea");
      ta.value = btn.dataset.email;
      ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch {}
      ta.remove();
      if (ok) markDone();
      else location.href = "mailto:" + btn.dataset.email;
    }
  }));

  // GitHub contribution graph
  (async () => {
    const box = document.getElementById("contrib");
    if (!box) return;
    try {
      const res = await fetch("https://github-contributions-api.jogruber.de/v4/justbwnn?y=last");
      if (!res.ok) throw new Error(res.status);
      const { contributions, total } = await res.json();
      const cells = contributions.map(d =>
        `<i class="l${d.level}" title="${d.count} kontribusi pada ${d.date}"></i>`
      ).join("");
      box.innerHTML =
        `<p class="contrib-total"><b>${total.lastYear}</b> kontribusi dalam setahun terakhir</p>
         <div class="contrib-grid">${cells}</div>
         <p class="contrib-legend">Sedikit <i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i> Banyak</p>`;
      setStat("contrib", total.lastYear);
      renderActivity(contributions);
    } catch {
      box.innerHTML = `<p class="empty">Grafik kontribusi tidak dapat dimuat. <a href="https://github.com/justbwnn" target="_blank" rel="noopener">Lihat di GitHub ↗</a></p>`;
    }
  })();

  // monthly activity timeline (from the same contribution data)
  function renderActivity(days) {
    const list = document.getElementById("activity");
    if (!list) return;
    const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    const groups = new Map();
    days.forEach(d => {
      const [y, m] = d.date.split("-");
      const key = `${y}-${m}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(d);
    });
    const keys = [...groups.keys()].reverse();
    list.innerHTML = keys.map((key, i) => {
      const [y, m] = key.split("-");
      const ds = groups.get(key);
      const total = ds.reduce((s, d) => s + d.count, 0);
      const active = ds.filter(d => d.count > 0);
      const body = total
        ? `${total} kontribusi pada ${active.length} hari aktif`
        : `<span class="muted">Belum ada aktivitas pada periode ini.</span>`;
      return `<li${i >= 6 ? ' class="extra" hidden' : ""}>
        <p class="act-month">${BULAN[+m - 1]} ${y}</p>
        <p class="act-body">${body}</p>
      </li>`;
    }).join("");
    list.hidden = false;

    const btn = document.getElementById("moreActivity");
    if (keys.length > 6) {
      btn.hidden = false;
      let open = false;
      btn.onclick = () => {
        open = !open;
        list.querySelectorAll(".extra").forEach(li => li.hidden = !open);
        btn.textContent = open ? "Sembunyikan aktivitas" : "Lihat semua aktivitas";
      };
    }
  }

  // cursor glow
  const glow = document.getElementById("cursorGlow");
  if (glow && !reduced && matchMedia("(hover: hover)").matches) {
    addEventListener("pointermove", e => {
      glow.style.transform = `translate3d(${e.clientX - 210}px, ${e.clientY - 210}px, 0)`;
      glow.classList.add("on");
    }, { passive: true });
    document.addEventListener("pointerleave", () => glow.classList.remove("on"));
  }

  // skill percentage counter
  const pctIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, target = +el.dataset.pct, t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / 900);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + "%";
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    pctIO.unobserve(el);
  }), { threshold: .6 });
  document.querySelectorAll(".pct").forEach(el => pctIO.observe(el));

  // back to top
  const toTop = document.getElementById("toTop");
  addEventListener("scroll", () => toTop.classList.toggle("show", scrollY > 600), { passive: true });
  toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }));

  // card spotlight follows cursor (delegasi: kartu digambar ulang dari API)
  if (!reduced && projectBox) projectBox.addEventListener("pointermove", e => {
    const card = e.target.closest(".project");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", e.clientX - r.left + "px");
    card.style.setProperty("--my", e.clientY - r.top + "px");
  });

  // button spotlight + magnetic pull (smoothed with rAF lerp)
  if (!reduced) {
    const btns = [...document.querySelectorAll(".cta a, .links a, .copy, form button, .theme")];
    btns.forEach(el => {
      el.classList.add("magnet");
      const s = { tx: 0, ty: 0, cx: 0, cy: 0, on: false };
      const loop = () => {
        s.cx += (s.tx - s.cx) * .12;
        s.cy += (s.ty - s.cy) * .12;
        el.style.transform = `translate(${s.cx}px, ${s.cy}px)`;
        if (s.on || Math.abs(s.tx - s.cx) > .05 || Math.abs(s.ty - s.cy) > .05) requestAnimationFrame(loop);
        else el.style.transform = "";
      };
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        el.style.setProperty("--mx", x + "px");
        el.style.setProperty("--my", y + "px");
        s.tx = (x / r.width - .5) * 8;
        s.ty = (y / r.height - .5) * 6;
        if (!s.on) { s.on = true; requestAnimationFrame(loop); }
      });
      el.addEventListener("pointerleave", () => { s.tx = s.ty = 0; s.on = false; requestAnimationFrame(loop); });
    });
  }

  // particle network background
  const cv = document.getElementById("bg");
  if (!reduced && cv.getContext) {
    const ctx = cv.getContext("2d");
    let W, H, pts = [];
    const N = 34, LINK = 130;
    function size() {
      W = cv.width = innerWidth * devicePixelRatio;
      H = cv.height = innerHeight * devicePixelRatio;
      cv.style.width = innerWidth + "px";
      cv.style.height = innerHeight + "px";
      pts = Array.from({ length: N }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .2 * devicePixelRatio,
        vy: (Math.random() - .5) * .2 * devicePixelRatio
      }));
    }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      const L = LINK * devicePixelRatio;
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const a = pts[i], b = pts[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < L) {
            ctx.strokeStyle = `rgba(94,234,212,${(1 - d / L) * .1})`;
            ctx.lineWidth = devicePixelRatio * .6;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = root.dataset.theme === "light" ? "rgba(79,70,229,.22)" : "rgba(129,140,248,.35)";
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.2 * devicePixelRatio, 0, 7); ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    size(); frame();
    addEventListener("resize", size);
  }
  } catch (e) { console.warn(e); }