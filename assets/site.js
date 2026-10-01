// Toneby 官网渲染 + 景深轮播 + 内嵌 LUT Gallery
(function () {
  var DATA;
  try {
    var s = JSON.parse(localStorage.getItem("lut_web_edits_v1"));
    DATA = (s && s.site) ? s.site : window.SITE_WEB;
  } catch (e) { DATA = window.SITE_WEB; }
  if (!DATA) return;

  var SHOWCASE_BASE = "/toneby-lut-showcase/";
  var IMG_V = "?v=1";

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function set(id, text) { var e = document.getElementById(id); if (e) e.textContent = text; }

  function storeBtn() {
    var a = el("a", "store-btn");
    a.href = DATA.hero.playUrl || "#";
    a.target = "_blank"; a.rel = "noopener";
    a.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 2.5v19l11-9.5L3 2.5z"/><path d="M14 12l4.5-3.9 2.6 1.5c.8.5.8 1.7 0 2.2l-2.6 1.5L14 12z" opacity=".8"/></svg>' +
      '<span>' + (DATA.hero.playLabel || "GET IT ON") + '<small>' + (DATA.hero.playStore || "GOOGLE PLAY") + '</small></span>';
    return a;
  }

  // ---------- 导航（点击平滑滚动，地址栏保持干净） ----------
  var brand = document.getElementById("navBrand");
  brand.innerHTML = '<span class="mark">T</span>' + DATA.nav.brand;
  var nl = document.getElementById("navLinks");
  var dl = el("a", "btn-nav", DATA.nav.downloadLabel || "DOWNLOAD");
  dl.href = DATA.nav.downloadHref || "#download";
  nl.appendChild(dl);
  (DATA.nav.links || []).slice().reverse().forEach(function (l) {
    var a = el("a", l.hideM ? "hide-m" : "", l.label);
    a.href = l.href || "#";
    if (l.ext) { a.target = "_blank"; a.rel = "noopener"; }
    a.addEventListener("click", function (e) {
      if (a.getAttribute("href").charAt(0) === "#") {
        e.preventDefault();
        var t = document.querySelector(a.getAttribute("href"));
        if (t) { t.scrollIntoView({ behavior: "smooth" }); history.replaceState(null, "", location.pathname); }
      }
    });
    nl.insertBefore(a, nl.firstChild);
  });

  // ---------- hero ----------
  set("heroIntro", DATA.hero.intro);
  var hb = document.getElementById("heroBtns");
  hb.appendChild(storeBtn());

  var groupsBox = document.getElementById("heroGroups");
  var groupBtns = [];
  (DATA.hero.groups || []).forEach(function (g, gi) {
    var b = el("button", "grp" + (gi === 0 ? " active" : ""));
    b.innerHTML = '<span class="no">' + g.no + "</span>" + g.label;
    b.onclick = function () {
      var idx = slides.findIndex(function (s) { return s.g === gi; });
      show(idx >= 0 ? idx : 0);
    };
    groupBtns.push(b);
    groupsBox.appendChild(b);
  });

  // ---------- 景深轮播 ----------
  var slides = (DATA.hero.slides || []).map(function (s) {
    return { src: s.src + IMG_V, cap: s.cap, g: s.g || 0 };
  });
  var cur = 0;
  var img = document.getElementById("shotImg");
  var back = document.getElementById("shotBack");
  var cap = document.getElementById("shotCaption");

  function render() {
    var s = slides[cur];
    img.src = s.src;
    back.src = slides[(cur + 1) % slides.length].src;
    cap.textContent = s.cap;
    var g = s.g;
    groupBtns.forEach(function (b, bi) { b.classList.toggle("active", bi === g); });
  }
  function show(i) {
    cur = (i + slides.length) % slides.length;
    img.style.opacity = 0;
    setTimeout(render, 130);
    setTimeout(function () { img.style.opacity = 1; }, 260);
  }
  document.getElementById("prevBtn").onclick = function () { show(cur - 1); };
  document.getElementById("nextBtn").onclick = function () { show(cur + 1); };
  var tx = null;
  img.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
  img.addEventListener("touchend", function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1));
    tx = null;
  }, { passive: true });
  render();

  // ---------- numbers ----------
  var ng = document.getElementById("numbersGrid");
  (DATA.numbers || []).forEach(function (n) {
    var c = el("div", "cell");
    c.appendChild(el("div", "big", n.no));
    c.appendChild(el("h3", "", n.title));
    c.appendChild(el("p", "", n.desc));
    ng.appendChild(c);
  });

  // ---------- features intro ----------
  set("featTag", DATA.intro2.tag);
  set("featTitle", DATA.intro2.title);
  set("featDesc", DATA.intro2.desc);

  // ---------- modules ----------
  var mg = document.getElementById("modulesGrid");
  (DATA.modules || []).forEach(function (m, i) {
    var d = el("div", "module" + (i % 2 === 1 ? " flip" : ""));
    var shot = el("div", "mod-shot");
    var mi = el("img");
    mi.src = m.src + IMG_V;
    mi.alt = m.title;
    shot.appendChild(mi);
    var t = el("div", "mod-txt");
    t.appendChild(el("div", "fig", m.fig));
    t.appendChild(el("div", "mod", m.mod));
    t.appendChild(el("h3", "", m.title));
    t.appendChild(el("p", "", m.desc));
    if (i % 2 === 1) { d.appendChild(t); d.appendChild(shot); }
    else { d.appendChild(shot); d.appendChild(t); }
    mg.appendChild(d);
  });

  // ---------- LUT Gallery（数据来自 LUT 展示站，本页内渲染） ----------
  var GAP = 8;
  function loadShowcaseData(cb) {
    try {
      var s = JSON.parse(localStorage.getItem("lut_site_edits_v1"));
      if (s && s.groups && s.groups.length) { cb(s.groups); return; }
    } catch (e) {}
    var sc = document.createElement("script");
    sc.src = SHOWCASE_BASE + "data.js";
    sc.onload = function () { cb(window.GROUPS || []); };
    sc.onerror = function () { cb([]); };
    document.head.appendChild(sc);
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
    groups.forEach(function (g, i) {
      var opt = el("option", "", g.name);
      opt.value = String(i);
      picker.appendChild(opt);
    });
    picker.addEventListener("change", function () { renderGallery(parseInt(picker.value)); });
    renderGallery(0);
  });

  // ---------- faq ----------
  var fl = document.getElementById("faqList");
  (DATA.faq || []).forEach(function (f) {
    var d = el("details");
    d.appendChild(el("summary", "", f.q));
    d.appendChild(el("div", "a", f.a));
    fl.appendChild(d);
  });

  // ---------- cta / footer ----------
  set("ctaTitle", DATA.cta.title);
  var cb = document.getElementById("ctaBtns");
  cb.appendChild(storeBtn());
  set("footBrand", DATA.footer.brand);
  var fl2 = document.getElementById("footLinks");
  var p1 = el("a", "", DATA.footer.privacyLabel); p1.href = DATA.footer.privacyHref;
  var p2 = el("a", "", DATA.footer.termsLabel); p2.href = DATA.footer.termsHref;
  fl2.appendChild(p1); fl2.appendChild(p2);
  set("footCopy", DATA.footer.copy);
})();
