// Toneby 官网渲染 + 卡片堆轮播（前1 + 左右灰各1，切换带动画）+ 内嵌 LUT Gallery
(function () {
  if (window.__SITE_ALREADY) return;
  window.__SITE_ALREADY = true;
  function mergeDeep(base, over) {
    if (Array.isArray(base)) return (over !== undefined && Array.isArray(over)) ? over : JSON.parse(JSON.stringify(base));
    if (base !== null && typeof base === "object") {
      var out = (over !== null && typeof over === "object" && !Array.isArray(over)) ? over : {};
      Object.keys(base).forEach(function (k) { out[k] = mergeDeep(base[k], out[k]); });
      return out;
    }
    return (over === undefined) ? base : over;
  }
  var DATA;
  try {
    var s = JSON.parse(localStorage.getItem("lut_web_edits_v1"));
    DATA = mergeDeep(SITE_WEB, (s && s.site) ? s.site : null);
  } catch (e) { DATA = SITE_WEB; }
  if (!DATA) return;
  if (DATA.siteTitle) document.title = DATA.siteTitle;

  var SHOWCASE_BASE = "/toneby-lut-showcase/";

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function set(id, text) { var e = document.getElementById(id); if (!e) return; e.textContent = text; e.style.display = text ? "" : "none"; }

  function storeBtn() {
    var a = el("a", "store-btn");
    a.href = DATA.hero.playUrl || "#";
    a.target = "_blank"; a.rel = "noopener";
    a.innerHTML = '<svg width="18" height="18" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/></svg>' +
      '<span>' + (DATA.hero.playLabel || "GET IT ON") + '<small>' + (DATA.hero.playStore || "GOOGLE PLAY") + '</small></span>';
    return a;
  }

  // ---------- 导航 ----------
  var brand = document.getElementById("navBrand");
  var logoHtml = DATA.nav.logoSrc ? ('<img class="logo-img" src="' + DATA.nav.logoSrc + '" alt="">') : '<span class="mark">T</span>';
  brand.innerHTML = logoHtml + DATA.nav.brand;
  var nl = document.getElementById("navLinks"); if (nl) nl.textContent = "";
  var dl = el("a", "btn-nav", DATA.nav.downloadLabel || "DOWNLOAD");
  dl.href = DATA.nav.downloadHref || "#download";
  nl.appendChild(dl);
  (DATA.nav.links || []).slice().reverse().forEach(function (l) {
    var a = el("a", l.hideM ? "hide-m" : "", l.label);
    a.href = l.href || "#";
    a.addEventListener("click", function (e) {
      if (a.getAttribute("href").charAt(0) === "#") {
        e.preventDefault();
        var t = document.querySelector(a.getAttribute("href"));
        if (t) { t.scrollIntoView({ behavior: "smooth" }); history.replaceState(null, "", location.pathname); }
      }
    });
    nl.insertBefore(a, nl.firstChild);
  });

  // ---------- hero 文案 ----------
  set("heroIntro", DATA.hero.intro);
  document.getElementById("heroBtns").appendChild(storeBtn());

  // ---------- 卡片堆轮播 ----------
  var slides = (DATA.hero.slides || []).map(function (s) { return { src: s.src, cap: s.cap, g: s.g || 0 }; });
  var N = slides.length;
  function idx(i) { return ((i % N) + N) % N; }
  function src(i) { return slides[idx(i)].src; }

  var cur = 0;
  var frontEl = document.getElementById("cardFront");
  var leftEl  = document.getElementById("cardLeft");
  var rightEl = document.getElementById("cardRight");
  var hiddenEl= document.getElementById("cardHidden");
  var cap = document.getElementById("shotCaption");
  var btns = document.querySelectorAll("#heroGroups .grp");

  function setPos(e, role) { e.className = "card c-" + role; }
  function img(e, i) { e.querySelector("img").src = slides[idx(i)].src; }
  function updateMeta() {
    var c = slides[cur];
    cap.textContent = c.cap;
    for (var i = 0; i < btns.length; i++) btns[i].classList.toggle("active", i === c.g);
  }
  function next() {
    if (N < 2) return;
    var newCur = idx(cur + 1);
    var nf = rightEl, nl = frontEl, nr = hiddenEl, nh = leftEl;
    img(nf, newCur);
    img(nr, newCur + 1);
    setPos(nf, "front"); setPos(nl, "left"); setPos(nr, "right"); setPos(nh, "hidden");
    frontEl = nf; leftEl = nl; rightEl = nr; hiddenEl = nh;
    cur = newCur; updateMeta();
  }
  function prev() {
    if (N < 2) return;
    var newCur = idx(cur - 1);
    var nf = leftEl, nr = frontEl, nl = hiddenEl, nh = rightEl;
    img(nf, newCur);
    img(nl, newCur - 1);
    setPos(nf, "front"); setPos(nl, "left"); setPos(nr, "right"); setPos(nh, "hidden");
    frontEl = nf; leftEl = nl; rightEl = nr; hiddenEl = nh;
    cur = newCur; updateMeta();
  }
  document.getElementById("prevBtn").onclick = prev;
  document.getElementById("nextBtn").onclick = next;
  var deckEl = document.getElementById("deck");
  var tx = null;
  deckEl.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
  deckEl.addEventListener("touchend", function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) (dx < 0 ? next() : prev());
    tx = null;
  }, { passive: true });

  var groupsBox = document.getElementById("heroGroups");
  var groupBtns = [];
  (DATA.hero.groups || []).forEach(function (g, gi) {
    var b = el("button", "grp" + (gi === 0 ? " active" : ""));
    b.innerHTML = '<span class="no">' + g.no + "</span>" + g.label;
    b.onclick = function () {
      var target = -1;
      for (var j = 0; j < N; j++) { if (slides[j].g === gi) { target = j; break; } }
      if (target < 0 || target === cur) return;
      var step = (target > cur && target - cur <= N / 2) ? 1 : -1;
      var t = setInterval(function () {
        if (cur === target) { clearInterval(t); return; }
        (step === 1) ? next() : prev();
      }, 210);
    };
    groupBtns.push(b);
    groupsBox.appendChild(b);
  });

  // 初始：front=0, right=1, hidden=2, left=最后一张
  img(frontEl, cur);
  img(rightEl, cur + 1);
  img(hiddenEl, cur + 2);
  img(leftEl, cur - 1);
  updateMeta();

  // ---------- numbers ----------
  var ng = document.getElementById("numbersGrid"); if (ng) ng.textContent = "";
  (DATA.numbers || []).forEach(function (n) {
    var c = el("div", "cell");
    if (n.no) c.appendChild(el("div", "big", n.no));
    if (n.title) c.appendChild(el("h3", "", n.title));
    if (n.desc) c.appendChild(el("p", "", n.desc));
    ng.appendChild(c);
  });

  // ---------- features intro ----------
  set("featTag", DATA.intro2.tag);
  set("featTitle", DATA.intro2.title);
  // ---------- modules（左 sticky 手机帧 + 滚动换图） ----------
  var modsFrame = document.getElementById("modsFrame"); if (modsFrame) modsFrame.textContent = "";
  var modsTexts = document.getElementById("modsTexts"); if (modsTexts) modsTexts.textContent = "";
  if (modsFrame && modsTexts) {
    var frameImgs = [];
    (DATA.modules || []).forEach(function (m, i) {
      if (m.src) {
        var im = el("img"); im.src = m.src; im.alt = m.title || ""; if (i === 0) im.className = "active";
        modsFrame.appendChild(im); frameImgs.push(im);
      }
      var tb = el("div", "mod-block"); tb.dataset.idx = i;
      tb.appendChild(el("div", "mod-ghost", ("0" + (i + 1)).slice(-2)));
      if (m.src) { var mob = el("img", "mod-inline"); mob.src = m.src; mob.alt = ""; tb.appendChild(mob); }
      if (m.fig) tb.appendChild(el("div", "fig", m.fig));
      if (m.mod) tb.appendChild(el("div", "mod", m.mod));
      if (m.title) tb.appendChild(el("h3", "", m.title));
      if (m.desc) tb.appendChild(el("p", "", m.desc));
      modsTexts.appendChild(tb);
    });
    if ("IntersectionObserver" in window && frameImgs.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.toggle("ghost-on", en.isIntersecting);
          var idx = parseInt(en.target.dataset.idx, 10);
          frameImgs.forEach(function (im, k) { im.className = k === idx ? "active" : ""; });
        });
      }, { rootMargin: "-40% 0px -40% 0px" });
      modsTexts.querySelectorAll(".mod-block").forEach(function (b) { io.observe(b); });
    }
  }

  set("featDesc", DATA.intro2.desc);

  // ---------- modules ----------
  var mg = document.getElementById("modulesGrid"); if (mg) mg.textContent = "";
  (DATA.modules || []).forEach(function (m, i) {
    var d = el("div", "module" + (i % 2 === 1 ? " flip" : ""));
    var shot = el("div", "mod-shot");
    var mi = el("img");
    mi.src = m.src;
    mi.alt = m.title;
    shot.appendChild(mi);
    var t = el("div", "mod-txt");
    if (m.fig) t.appendChild(el("div", "fig", m.fig));
    if (m.mod) t.appendChild(el("div", "mod", m.mod));
    if (m.title) t.appendChild(el("h3", "", m.title));
    if (m.desc) t.appendChild(el("p", "", m.desc));
    if (i % 2 === 1) { d.appendChild(t); d.appendChild(shot); }
    else { d.appendChild(shot); d.appendChild(t); }
    if (mg) mg.appendChild(d);
  });

  // ---------- LUT Gallery（数据来自 LUT 展示站，本页内渲染） ----------
  var GAP = 8;
  function loadShowcaseData(cb) {
    try {
      var s = JSON.parse(localStorage.getItem("lut_site_edits_v1"));
      if (s && s.groups && s.groups.length) { cb(s.groups); return; }
    } catch (e) {}
function tryShowcase(n) {
      var sc = document.createElement("script");
      sc.src = SHOWCASE_BASE + "data.js?r=" + (5 - n) + "-" + Date.now();
      sc.onload = function () {
        var g = [];
        try { g = (typeof GROUPS !== "undefined") ? GROUPS : (window.GROUPS || []); } catch (e) { g = []; }
        if ((g && g.length) || n <= 0) cb(g || []);
        else setTimeout(function () { tryShowcase(n - 1); }, 900);
      };
      sc.onerror = function () { if (n > 0) setTimeout(function () { tryShowcase(n - 1); }, 900); else cb([]); };
      document.head.appendChild(sc);
    }
    tryShowcase(3);
  }
  function loadAll(srcs) {
    return Promise.all(srcs.map(function (src) {
      return new Promise(function (resolve) {
        var im = new Image();
        im.onload = function () {
          resolve({ src: SHOWCASE_BASE + src, ar: Math.max(0.25, im.naturalWidth / Math.max(1, im.naturalHeight)) });
        };
        im.onerror = function () { resolve({ src: SHOWCASE_BASE + src, ar: 1.5, broken: true }); };
        im.src = SHOWCASE_BASE + src;
      });
    }));
  }
  function splitRows(items, W, targetH) {
    var n = items.length;
    var pre = [0];
    for (var k = 0; k < n; k++) pre.push(pre[k] + items[k].ar);
    var INF = 1e18;
    var dp = new Array(n + 1).fill(INF);
    var from = new Array(n + 1).fill(-1);
    dp[0] = 0;
    for (var i = 1; i <= n; i++) {
      for (var j = 0; j < i; j++) {
        var cnt = i - j, sum = pre[i] - pre[j];
        var h = (W - GAP * (cnt - 1)) / sum;
        if (h < targetH * 0.5) continue;
        var cost = dp[j] + (h - targetH) * (h - targetH);
        if (cost < dp[i]) { dp[i] = cost; from[i] = j; }
      }
    }
    var rows = [], i2 = n;
    if (dp[n] >= INF) {
      for (var q = 0; q < n; q++) rows.push([items[q]]);
      return rows;
    }
    while (i2 > 0) { var j2 = from[i2]; rows.unshift(items.slice(j2, i2)); i2 = j2; }
    return rows;
  }
  function renderRows(container, items, W) {
    container.textContent = "";
    var targetH = W < 480 ? 110 : 150;
    splitRows(items, W, targetH).forEach(function (row) {
      var sum = row.reduce(function (a, b) { return a + b.ar; }, 0);
      var h = (W - GAP * (row.length - 1)) / sum;
      var rowEl = el("div", "photo-row");
      rowEl.style.height = h + "px";
      row.forEach(function (im) {
        var g = el("img");
        g.src = im.src;
        g.alt = "";
        g.style.flexGrow = String(im.ar);
        g.style.flexBasis = "0";
        rowEl.appendChild(g);
      });
      container.appendChild(rowEl);
    });
  }
  var photoBlocks = [];
  function renderPost(post, lut) {
    post.appendChild(el("div", "lut-title", lut.title));
    post.appendChild(el("div", "lut-desc", lut.desc));
    if (lut.images && lut.images.length) {
      var wrap = el("div", "photo-rows");
      post.appendChild(wrap);
      loadAll(lut.images).then(function (items) {
        photoBlocks.push({ wrap: wrap, items: items });
        var W = wrap.clientWidth || 620;
        renderRows(wrap, items, W);
      });
      var cap2 = el("div", "photo-caption");
      if (lut.film) cap2.appendChild(el("span", "film-line", lut.film));
      if (lut.note) cap2.appendChild(el("span", "note-line", lut.note));
      if (cap2.childNodes.length) post.appendChild(cap2);
    }
    if (lut.credits && lut.credits.length) {
      var cr = el("div", "credits");
      lut.credits.forEach(function (line) { if (line && line.trim()) cr.appendChild(el("div", "", line)); });
      if (cr.childNodes.length) post.appendChild(cr);
    }
  }
  var picker = document.getElementById("galleryPicker");
  var postsBox = document.getElementById("galleryPosts");
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      photoBlocks.forEach(function (b) {
        var W = b.wrap.clientWidth;
        if (W) renderRows(b.wrap, b.items, W);
      });
    }, 150);
  });

  function renderGallery(index) {
    var g = window.__GALLERY_GROUPS[index];
    if (!g) return;
    picker.value = String(index);
    postsBox.textContent = "";
    photoBlocks = [];
    g.luts.forEach(function (lut) {
      var post = el("section", "lut-post");
      renderPost(post, lut);
      postsBox.appendChild(post);
    });
  }
  loadShowcaseData(function (groups) {
    window.__GALLERY_GROUPS = groups;
    if (!groups.length) {
      postsBox.appendChild(el("p", "lut-desc", "LUT 数据加载中，请稍后刷新。"));
      return;
    }
    picker.textContent = "";
    groups.forEach(function (g, i) {
      var opt = el("option", "", g.name);
      opt.value = String(i);
      picker.appendChild(opt);
    });
    picker.addEventListener("change", function () { renderGallery(parseInt(picker.value)); });
    renderGallery(0);
  });

  set("galleryTitle", DATA.galleryTitle || "LUT Gallery");

  set("heroEyebrow", DATA.hero.eyebrow || "");
  set("heroBig", DATA.hero.big || "");
  set("heroSub", DATA.hero.sub || "");

  // ---------- faq ----------
  set("faqTitle", DATA.faqTitle || "Frequently Asked Questions");
  var fl = document.getElementById("faqList"); if (fl) fl.textContent = "";
  (DATA.faq || []).forEach(function (f) {
    var d = el("details");
    d.appendChild(el("summary", "", f.q));
    d.appendChild(el("div", "a", f.a));
    fl.appendChild(d);
  });

  // ---------- cta / footer ----------
  set("ctaTitle", DATA.cta.title);
  var cb = document.getElementById("ctaBtns"); if (cb) cb.textContent = "";
  cb.appendChild(storeBtn());
  set("footBrand", DATA.footer.brand);
  var fl2 = document.getElementById("footLinks"); if (fl2) fl2.textContent = "";
  if (DATA.footer.privacyLabel) { var p1 = el("a", "", DATA.footer.privacyLabel); p1.href = DATA.footer.privacyHref; fl2.appendChild(p1); }
  if (DATA.footer.termsLabel) { var p2 = el("a", "", DATA.footer.termsLabel); p2.href = DATA.footer.termsHref; fl2.appendChild(p2); }
  set("footCopy", DATA.footer.copy);
})();

window.__SITE_BOOTED = true;

window.__SITE_BOOTED = true;
