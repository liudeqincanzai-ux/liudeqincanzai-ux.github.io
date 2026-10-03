// Toneby 官网渲染 + 卡片堆轮播（前1 + 左右灰各1，切换带动画）+ 内嵌 LUT Gallery
(function () {
  function mergeDeep(base, over) {
    if (Array.isArray(base)) {
      /* v59b：数组逐下标递归合并——整体替换会把未翻译的路径键（src 等）全部丢掉 */
      if (!over || !Array.isArray(over)) return JSON.parse(JSON.stringify(base));
      var arr = JSON.parse(JSON.stringify(base));
      over.forEach(function (item, i) {
        if (i < arr.length) arr[i] = mergeDeep(arr[i], item);
        else arr[i] = item;
      });
      return arr;
    }
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
  /* v60 预存翻译：三语文案内置于 data.js，切语言 = 本地合并，瞬时、无网络 */
  var curLang = "en";
  try { curLang = localStorage.getItem("site_lang") || "en"; } catch (e0) {}
  try {
    if (curLang !== "en" && DATA.translations && DATA.translations[curLang]) {
      DATA = mergeDeep(DATA, DATA.translations[curLang]);
    }
  } catch (e0) {}
  var TR_SKIP = { src:1, href:1, url:1, logoSrc:1, playUrl:1, downloadHref:1, privacyHref:1, termsHref:1,
    sections:1, no:1, cap:1, date:1, brand:1, siteTitle:1, privacyContent:1, termsContent:1,
    privacyTitle:1, termsTitle:1, uiFontScale:1, autoTranslate:1, translations:1, g:1,
    before:1, after:1, linkUrl:1, img:1, images:1, shots:1, slides:1, poster:1, thumb:1, icon:1, iconSrc:1, name:1 };
  function trCollect(obj, path, out) {
    if (!obj || typeof obj !== "object") return;
    Object.keys(obj).forEach(function (k) {
      if (TR_SKIP[k]) return;
      var v = obj[k], p = path.concat(k);
      if (Array.isArray(v)) { v.forEach(function (item, i) { trCollect(item, p.concat(i), out); }); return; }
      if (v && typeof v === "object") { trCollect(v, p, out); return; }
      if (typeof v !== "string") return;
      var tv = v.trim();
      if (!tv || !/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7afa-zA-Z]/.test(tv)) return; /* 无文字（纯数字/符号）不翻 */
      if (/^(https?:)?\/\//i.test(tv) || /\.(jpg|jpeg|png|webp|gif|svg|css|js|ico)(\?|#|$)/i.test(tv)) return; /* 路径/URL 免译 */
      if (/^toneby[™\s.!]*$/i.test(tv)) return; /* 品牌词免译 */
      out.push({ path: p, text: v });
    });
  }
  var trCache = {};
  try { trCache = JSON.parse(localStorage.getItem("site_tr_cache_v1")) || {}; } catch (e0) { trCache = {}; }
  var trBar = null;
  function showTrBar(done, total) {
    if (!document.body) return;
    if (!trBar) {
      trBar = document.createElement("div");
      trBar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#111;color:#fff;font:12px/1.6 monospace;padding:7px 12px;text-align:center;pointer-events:none";
      document.body.appendChild(trBar);
    }
    trBar.textContent = "Translating / 翻译中 " + done + " / " + total + " …";
  }
  function hideTrBar() { if (trBar) { try { trBar.remove(); } catch (e) {} trBar = null; } }
  function trSaveCache() { try { localStorage.setItem("site_tr_cache_v1", JSON.stringify(trCache)); } catch (e0) { try { window.__TR_SAVE_ERR = String(e0 && e0.message || e0); } catch (e1) {} } }
  function trFixBrand(t) { return String(t).replace(/トーンビー/g, "TONEBY").replace(/通比/g, "TONEBY"); }
  function trOne(text, lang) {
    var gtx = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" + lang + "&dt=t&q=" + encodeURIComponent(text);
    var mm = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=Autodetect|" + lang;
    function req(url, ms) {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, ms);
      return fetch(url, { signal: ctrl.signal }).then(function (r) { return r.json(); }).then(function (j) { clearTimeout(timer); return j; }).catch(function () { clearTimeout(timer); return null; });
    }
    var p = req(gtx, 3500).then(function (j) {
      if (j && j[0] && j[0].length) {
        var out = "";
        j[0].forEach(function (seg) { if (seg && seg[0]) out += seg[0]; });
        if (out.trim()) return trFixBrand(out.trim());
      }
      return req(mm, 10000).then(function (j2) {
        var t = j2 && j2.responseData && j2.responseData.translatedText;
        return (t && t.trim()) ? trFixBrand(t.trim()) : null;
      });
    });
    /* 整体硬超时兜底：任何情况下 16s 必返回，绝不挂死 worker 链 */
    return Promise.race([p, new Promise(function (res) { setTimeout(function () { res(null); }, 16000); })]);
  }
  /* 收集目标对象全部待翻句子，返回 {jobs, pending, overlay Promise} */
  function trPrepare(objs, lang) {
    var jobs = [];
    objs.forEach(function (o) { trCollect(o.data, o.prefix || [], jobs); });
    var seen = {}, uniq = [];
    jobs.forEach(function (j) { if (!seen[j.text]) { seen[j.text] = true; uniq.push(j.text); } });
    var pending = uniq.filter(function (t) { return !(lang + "|" + t in trCache); });
    return { jobs: jobs, pending: pending };
  }
  function trRun(lang, pending, onProgress) {
    var done = 0, fail = 0, total = pending.length;
    if (!total) return Promise.resolve({ fail: 0 });
    var idx = 0;
    function worker() {
      if (idx >= pending.length) return Promise.resolve();
      var text = pending[idx++];
      return trOne(text, lang).then(function (t) {
        done++;
        if (t) { trCache[lang + "|" + text] = t; } else fail++;
        try { if (onProgress && (done % 3 === 0 || done === total)) onProgress(done, total); } catch (e) {}
        return worker();
      }).catch(function () {
        /* 单句任何异常：计数后继续，绝不炸断 worker 链 */
        done++; fail++;
        return worker();
      });
    }
    var ws = [];
    for (var w = 0; w < 6; w++) ws.push(worker().catch(function () {}));
    return Promise.all(ws).then(function () { try { trSaveCache(); } catch (e) {} return { fail: fail }; });
  }
  function trBuildOverlay(objs, lang) {
    var overlay = {};
    function setPath(o, path, v) { var cur = o; for (var i = 0; i < path.length - 1; i++) { var k = path[i], nk = path[i + 1]; if (cur[k] === undefined || cur[k] === null) cur[k] = typeof nk === "number" ? [] : {}; cur = cur[k]; } cur[path[path.length - 1]] = v; }
    objs.forEach(function (o) {
      var jobs = [];
      trCollect(o.data, o.prefix || [], jobs);
      jobs.forEach(function (j) {
        var t = trCache[lang + "|" + j.text];
        if (t) {
          var full = j.path; /* trCollect 已含 prefix，不再重复拼接 */
          setPath(overlay, full, t);
        }
      });
    });
    return overlay;
  }
  /* boot：全命中→立即覆盖渲染；有缺失→先英文渲染，后台补翻后 reload 一次 */
  var __trObjs = null;
  function trObjs() {
    if (!__trObjs) __trObjs = [{ data: DATA, prefix: [] }].concat((window.__GALLERY_GROUPS || []).map(function (g, i) { return { data: g, prefix: ["showcase", i] }; }));
    return __trObjs;
  }
  /* v60 预存模式：语言在 data.js 内置，切换纯本地 */
  var SHOWCASE_TR = (curLang !== "en" && DATA.translations && DATA.translations[curLang]) ? (DATA.translations[curLang].showcase || null) : null;
  if (curLang !== "en") { /* 保留结构占位，逻辑见下方预存应用 */ }
  function applyOverlayObj(targetObj, overlay, prefix) {
    /* overlay 是完整路径（含 showcase 前缀），把其中属于该组的部分原位 mergeDeep */
    var sub = overlay;
    for (var i = 0; i < prefix.length; i++) { sub = sub ? sub[prefix[i]] : undefined; if (sub === undefined) return; }
    mergeDeep(targetObj, sub);
  }
  if (DATA.siteTitle) document.title = DATA.siteTitle;

  var SHOWCASE_BASE = "/toneby-lut-showcase/";

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function set(id, text) { var e = document.getElementById(id); if (!e) return; e.textContent = text; e.style.display = text ? "" : "none"; }
  /* v61：容器内带后缀的 id 赋值（克隆板块用） */
  function qset(root, suf, id, text) { var e = root.querySelector("#" + id + suf); if (!e) return; e.textContent = text; e.style.display = text ? "" : "none"; }

  function storeBtn(d) {
    var a = el("a", "store-btn");
    a.href = d.playUrl || DATA.hero.playUrl || "#"; /* v62：CTA 等板块未配链接时回落首屏的 Google Play 链接 */
    a.target = "_blank"; a.rel = "noopener";
    a.innerHTML = '<svg width="18" height="18" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/></svg>' +
      '<span>' + (d.playLabel || "GET IT ON") + '<small>' + (d.playStore || "GOOGLE PLAY") + '</small></span>';
    return a;
  }

  // ---------- 导航 ----------
  var brand = document.getElementById("navBrand");
  var logoHtml = DATA.nav.logoSrc ? ('<img class="logo-img" src="' + DATA.nav.logoSrc + '" alt="">') : '<span class="mark">T</span>';
  brand.innerHTML = logoHtml + DATA.nav.brand;
  var nl = document.getElementById("navLinks"); if (nl) nl.textContent = "";
  var LANGS = [{ id: "en", label: "EN" }, { id: "ja", label: "日本語" }, { id: "zh-CN", label: "简体中文" }];
  var curLabel = "EN";
  LANGS.forEach(function (l) { if (l.id === curLang) curLabel = l.label; });
  var langWrap = el("span", "lang-wrap");
  var langBtn = el("button", "lang-btn cur");
  langBtn.type = "button"; langBtn.textContent = curLabel;
  langBtn.setAttribute("aria-haspopup", "true");
  var langPop = el("span", "lang-pop");
  LANGS.forEach(function (l) {
    var it = el("button", "lang-opt" + (l.id === curLang ? " on" : ""));
    it.type = "button"; it.textContent = l.label;
    it.onclick = function (ev) {
      ev.stopPropagation();
      if (l.id === curLang) { langPop.classList.remove("open"); return; }
      /* v60 预存模式：文案已内置三语，切换纯本地瞬时 */
      try { localStorage.setItem("site_lang", l.id); } catch (e) {}
      location.reload();
    };
    langPop.appendChild(it);
  });
  langBtn.onclick = function (e) { e.stopPropagation(); langPop.classList.toggle("open"); };
  document.addEventListener("click", function () { langPop.classList.remove("open"); });
  langPop.onclick = function (e) { e.stopPropagation(); };
  langWrap.appendChild(langBtn); langWrap.appendChild(langPop);
  nl.appendChild(langWrap);
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

  // ---------- hero（v61 函数化：基础实例与克隆实例共用，状态各自闭包） ----------
  function renderHero(root, d, suf) {
    if (!root) return;
    function q(id) { return root.querySelector("#" + id + suf); }
    qset(root, suf, "heroEyebrow", d.eyebrow || "");
    qset(root, suf, "heroBig", d.big || "");
    qset(root, suf, "heroSub", d.sub || "");
    qset(root, suf, "heroIntro", d.intro);
    var hb = q("heroBtns"); if (hb) { hb.textContent = ""; hb.appendChild(storeBtn(d)); }

    var slides = (d.slides || []).map(function (s) { return { src: s.src, cap: s.cap, g: s.g || 0 }; });
    var N = slides.length;
    function idx(i) { return ((i % N) + N) % N; }
    function src(i) { return slides[idx(i)].src; }

    var cur = 0;
    var frontEl = q("cardFront");
    var leftEl  = q("cardLeft");
    var rightEl = q("cardRight");
    var hiddenEl= q("cardHidden");
    var cap = q("shotCaption");
    var btns = root.querySelectorAll("#heroGroups" + suf + " .grp");

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
    var pb = q("prevBtn"); if (pb) pb.onclick = prev;
    var nb2 = q("nextBtn"); if (nb2) nb2.onclick = next;
    var deckEl = q("deck");
    var dragX = 0, dragY = 0, dragDX = 0, dragging = false, horiz = null, rafPending = false, pendingDX = 0, releaseTimer = 0;
    var SW_TH = 7, FLICK_V = 0.45, SW_EASE = "transform .45s cubic-bezier(.4,0,.2,1)";
    var lastT = 0, lastX = 0, velX = 0;
    function dampen(dx) {
      var sign = dx < 0 ? -1 : 1, a = Math.abs(dx);
      return sign * (50 * (1 - Math.exp(-a / 370)));
    }
    function applyDX() {
      rafPending = false;
      if (dragging) deckEl.style.transform = "translateX(" + pendingDX + "px)";
    }
    deckEl.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) return;
      clearTimeout(releaseTimer);
      dragX = e.touches[0].clientX; dragY = e.touches[0].clientY;
      dragDX = 0; pendingDX = 0; dragging = true; horiz = null;
      lastT = performance.now(); lastX = dragX; velX = 0;
      deckEl.style.transition = "none";
      deckEl.style.transform = "translateX(0px)";
    }, { passive: true });
    deckEl.addEventListener("touchmove", function (e) {
      if (!dragging) return;
      var x = e.touches[0].clientX, y = e.touches[0].clientY;
      var dx = x - dragX, dy = y - dragY;
      if (Math.abs(dx) + Math.abs(dy) < 4) return;
      horiz = Math.abs(dx) > Math.abs(dy);
      if (!horiz) return;
      if (e.cancelable) e.preventDefault();
      var now = performance.now(), dt = now - lastT;
      if (dt > 0) { velX = velX * 0.7 + ((x - lastX) / dt) * 0.3; }
      lastT = now; lastX = x;
      pendingDX = dampen(dx);
      if (!rafPending) { rafPending = true; requestAnimationFrame(applyDX); }
    }, { passive: false });
    function dragEnd() {
      if (!dragging && !rafPending) return;
      dragging = false; rafPending = false;
      var byDist = Math.abs(pendingDX) > SW_TH;
      var byFlick = Math.abs(velX) > FLICK_V && Math.abs(pendingDX) > 6;
      var dir = byDist ? pendingDX : (byFlick ? velX : 0);
      deckEl.style.transition = SW_EASE;
      deckEl.style.transform = "translateX(0)";
      releaseTimer = setTimeout(function () { deckEl.style.transition = ""; deckEl.style.transform = ""; }, 520);
      if (dir) (dir < 0 ? next() : prev());
      pendingDX = 0; horiz = null; velX = 0;
    }
    deckEl.addEventListener("touchend", dragEnd, { passive: true });
    deckEl.addEventListener("touchcancel", dragEnd, { passive: true });

    var groupsBox = q("heroGroups");
    var groupBtns = [];
    (d.groups || []).forEach(function (g, gi) {
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

    img(frontEl, cur);
    img(rightEl, cur + 1);
    img(leftEl, cur - 1);
    updateMeta();
  }

  // ---------- numbers（v61 函数化） ----------
  function renderNumbers(root, list, suf) {
    if (!root) return;
    var ng = root.querySelector("#numbersGrid" + suf); if (ng) ng.textContent = "";
    (list || []).forEach(function (n) {
      var c = el("div", "cell");
      if (n.no) c.appendChild(el("div", "big", n.no));
      if (n.title) c.appendChild(el("h3", "", n.title));
      if (n.desc) c.appendChild(el("p", "", n.desc));
      ng.appendChild(c);
    });
  }

  // ---------- features intro（v61 函数化） ----------
  function renderFeatures(root, d, suf) {
    if (!root) return;
    qset(root, suf, "featTag", d.tag);
    qset(root, suf, "featTitle", d.title);
    qset(root, suf, "featDesc", d.desc);
  }
  // ---------- modules（v61 函数化：左 sticky 手机帧 + 滚动换图） ----------
  function renderModules(root, list, suf) {
    if (!root) return;
    var modsFrame = root.querySelector("#modsFrame" + suf); if (modsFrame) modsFrame.textContent = "";
    var modsTexts = root.querySelector("#modsTexts" + suf); if (modsTexts) modsTexts.textContent = "";
    if (modsFrame && modsTexts) {
      var frameImgs = [];
      (list || []).forEach(function (m, i) {
        if (m.src) {
          var im = el("img"); im.src = m.src; im.alt = m.title || ""; if (i === 0) im.className = "active";
          modsFrame.appendChild(im); frameImgs.push(im);
        }
        var tb = el("div", "mod-block"); tb.dataset.idx = i;
        var tw = el("div", "mod-txtwrap");
        tw.appendChild(el("div", "mod-ghost", ("0" + (i + 1)).slice(-2)));
        if (m.src) { var mob = el("img", "mod-inline"); mob.src = m.src; mob.alt = ""; tb.appendChild(mob); }
        if (m.fig) tw.appendChild(el("div", "fig", m.fig));
        if (m.mod) tw.appendChild(el("div", "mod", m.mod));
        if (m.title) tw.appendChild(el("h3", "", m.title));
        if (m.desc) tw.appendChild(el("p", "", m.desc));
        tb.appendChild(tw);
        modsTexts.appendChild(tb);
      });
      if ("IntersectionObserver" in window && frameImgs.length) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            en.target.classList.toggle("ghost-on", en.isIntersecting);
            if (!en.isIntersecting) return;
            var idx2 = parseInt(en.target.dataset.idx, 10);
            frameImgs.forEach(function (im, k) { im.className = k === idx2 ? "active" : ""; });
          });
        }, { rootMargin: "-40% 0px -40% 0px" });
        modsTexts.querySelectorAll(".mod-block").forEach(function (b) { io.observe(b); });
      }
    }
  }




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
  /* v61：多画廊实例共享一次数据加载 */
  function onGroupsReady(cb) {
    if (window.__GALLERY_GROUPS) { cb(window.__GALLERY_GROUPS); return; }
    (window.__galWaiters = window.__galWaiters || []).push(cb);
    if (!window.__galLoading) {
      window.__galLoading = true;
      loadShowcaseData(function (groups) {
        window.__GALLERY_GROUPS = groups;
        (window.__galWaiters || []).forEach(function (w) { try { w(groups); } catch (e) {} });
        window.__galWaiters = [];
      });
    }
  }
  function loadAll(srcs) {
    return Promise.all(srcs.map(function (src) {
      return new Promise(function (resolve) {
        var im = new Image();
        im.onload = function () {
          resolve({ src: SHOWCASE_BASE + src, ar: im.naturalWidth / Math.max(1, im.naturalHeight) });
        };
        im.onerror = function () { resolve({ src: SHOWCASE_BASE + src, ar: 1.5, broken: true }); };
        im.src = SHOWCASE_BASE + src;
      });
    }));
  }
  /* ---- v45：全画廊统一模式——每一行都铺满宽度、多图拼行、行高尽量一致 ----
     1) 全局搜索一个目标行高 H（90~460），使「整组所有帖子」的切行总代价最小；
     2) 每帖 DP 切行，代价 = Σ(行高−H)²·图数 + 单图行重罚（杜绝一张图占一行）；
     3) 渲染时每行永远铺满容器宽度（高度=该行自然高度），不再收窄居中——左右不留空位。 */
  function rowNatH(cnt, sum, W) {
    return (W - GAP * (cnt - 1) - 2 * cnt) / sum + 2; /* 与渲染公式一致（含边框补偿） */
  }
  function dpRows(items, W, H) {
    var n = items.length;
    var pre = [0];
    for (var k = 0; k < n; k++) pre.push(pre[k] + items[k].ar);
    var INF = 1e18, SOLO = 520 * 520;
    var dp = new Array(n + 1).fill(INF);
    var from = new Array(n + 1).fill(-1);
    dp[0] = 0;
    for (var i = 1; i <= n; i++) {
      for (var j = 0; j < i; j++) {
        if (dp[j] >= INF) continue;
        var cnt = i - j, sum = pre[i] - pre[j];
        var nat = rowNatH(cnt, sum, W);
        var c = dp[j] + (nat - H) * (nat - H) * cnt + (cnt === 1 ? SOLO : 0);
        if (c < dp[i]) { dp[i] = c; from[i] = j; }
      }
    }
    var rows = [], i2 = n;
    while (i2 > 0) { var j2 = from[i2]; rows.unshift(items.slice(j2, i2)); i2 = j2; }
    return { rows: rows, cost: dp[n] };
  }
  function computeGroupRows(groupItems, W) {
    var best = null;
    for (var H = 90; H <= 460; H += 10) {
      var total = 0, rowsAll = [];
      for (var p = 0; p < groupItems.length; p++) {
        var r = dpRows(groupItems[p], W, H);
        total += r.cost;
        rowsAll.push(r.rows);
      }
      if (!best || total < best.total) best = { total: total, H: H, rowsAll: rowsAll };
    }
    return best;
  }
  function renderRows(container, rows, W) {
    container.textContent = "";
    rows.forEach(function (row) {
      var sum = row.reduce(function (a, b) { return a + b.ar; }, 0);
      if (row.length === 1) { /* 单图（仅当帖子只有一张图等不可避免时）：铺满宽度 */
        var solo = el("img", "photo-single");
        solo.src = row[0].src; solo.alt = "";
        container.appendChild(solo);
        return;
      }
      var h = (W - GAP * (row.length - 1) - 2 * row.length) / sum + 2; /* 补偿 1px 边框，行内零裁切 */
      var rowEl = el("div", "photo-row");
      rowEl.style.height = h + "px"; /* 永远铺满宽度，不收窄、不留两边空位 */
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
  function renderPost(post, lut, blocks) {
    post.appendChild(el("div", "lut-title", lut.title));
    post.appendChild(el("div", "lut-desc", lut.desc));
    if (lut.images && lut.images.length) {
      var wrap = el("div", "photo-rows");
      post.appendChild(wrap);
      blocks.push({ wrap: wrap, lut: lut, items: null });
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
  function layoutGroup() {
    if (!groupBlocks.length) return;
    for (var i = 0; i < groupBlocks.length; i++) if (!groupBlocks[i].items) return; /* 图片未加载完 */
    var W = groupBlocks[0].wrap.clientWidth || postsBox.clientWidth || 0;
    if (!W) return; /* 容器还没布局好，等 ResizeObserver 触发再排 */
    /* v45：全画廊统一模式——全局目标行高 + 每行铺满宽度 */
    var gi = groupBlocks.map(function (b) { return b.items; });
    var best = computeGroupRows(gi, W);
    if (!best) return;
    groupBlocks.forEach(function (b, i2) { renderRows(b.wrap, best.rowsAll[i2], W); });
  }
  /* v61：画廊函数化——每个实例独立 picker/布局状态，数据源共享一次加载 */
  function initGallery(root, d, suf) {
    if (!root) return;
    function q(id) { return root.querySelector("#" + id + suf); }
    qset(root, suf, "galleryTitle", d.galleryTitle || "LUT Gallery");
    qset(root, suf, "galleryDesc", (d.gallery && d.gallery.desc) || "");
    var picker = q("galleryPicker");
    var postsBox = q("galleryPosts");
    var groupBlocks = [];
    var resizeTimer = null;
    function scheduleLayout() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layoutGroup, 120);
    }
    window.addEventListener("resize", scheduleLayout);
    window.addEventListener("orientationchange", scheduleLayout);
    window.addEventListener("load", scheduleLayout);
    if (window.ResizeObserver) {
      var __galRO = new ResizeObserver(scheduleLayout);
      if (postsBox) __galRO.observe(postsBox);
    }

    function layoutGroup() {
      if (!groupBlocks.length) return;
      for (var i = 0; i < groupBlocks.length; i++) if (!groupBlocks[i].items) return;
      var W = groupBlocks[0].wrap.clientWidth || (postsBox && postsBox.clientWidth) || 0;
      if (!W) return;
      var gi = groupBlocks.map(function (b) { return b.items; });
      var best = computeGroupRows(gi, W);
      if (!best) return;
      groupBlocks.forEach(function (b, i2) { renderRows(b.wrap, best.rowsAll[i2], W); });
    }
    function syncPickerUI() {
      var fake = q("gpFake");
      var pop = q("gpPop");
      if (!fake || !pop) return;
      var i = parseInt(picker.value) || 0;
      var groups = window.__GALLERY_GROUPS || [];
      if (groups[i]) fake.textContent = groups[i].name;
      Array.prototype.forEach.call(pop.children, function (c, ci) {
        c.className = "gp-opt" + (ci === i ? " on" : "");
      });
    }
    function renderGroupPosts(g) {
      postsBox.textContent = "";
      groupBlocks = [];
      g.luts.forEach(function (lut) {
        var post = el("section", "lut-post");
        renderPost(post, lut, groupBlocks);
        postsBox.appendChild(post);
      });
      Promise.all(groupBlocks.map(function (b) {
        return loadAll(b.lut.images).then(function (items) { b.items = items; });
      })).then(scheduleLayout);
    }
    function applyShowcasePreset(groups) {
      /* v62：LUT 自身三语字段（*_ja/*_zh，showcase 编辑器维护）最优先；留空回落官网 translations.showcase，再回落英文 */
      var langKey = curLang === "ja" ? "_ja" : (curLang === "zh-CN" ? "_zh" : null);
      if (langKey) {
        groups.forEach(function (g) {
          (g.luts || []).forEach(function (lu) {
            ["title", "desc", "film", "note"].forEach(function (k) {
              var v = lu[k + langKey];
              if (typeof v === "string" && v.trim()) lu[k] = v;
            });
          });
        });
      }
      if (!SHOWCASE_TR) return;
      groups.forEach(function (g, gi) {
        var sub = SHOWCASE_TR[gi];
        if (!sub) return;
        if (sub.name) g.name = sub.name;
        (sub.luts || []).forEach(function (lu, j) {
          if (!g.luts[j]) return;
          if (!langKey || !(g.luts[j].title || "").trim()) { if (lu.title) g.luts[j].title = lu.title; }
          if (!langKey || !(g.luts[j].desc || "").trim()) { if (lu.desc) g.luts[j].desc = lu.desc; }
        });
        if (picker.options[gi]) picker.options[gi].textContent = g.name;
      });
      syncPickerUI();
    }
    function renderGallery(index) {
      var g = window.__GALLERY_GROUPS[index];
      if (!g) return;
      picker.value = String(index);
      syncPickerUI();
      renderGroupPosts(g);
    }
    onGroupsReady(function (groups) {
      if (!groups.length) {
        postsBox.appendChild(el("p", "lut-desc", "LUT 数据加载中，请稍后刷新。"));
        return;
      }
      applyShowcasePreset(groups);
      picker.textContent = "";
      groups.forEach(function (g, i) {
        var opt = el("option", "", g.name);
        opt.value = String(i);
        picker.appendChild(opt);
      });
      picker.addEventListener("change", function () { renderGallery(parseInt(picker.value)); });
      var gpWrap = picker.parentNode;
      var gpFake = el("button", "gp-fake");
      gpFake.type = "button"; gpFake.id = "gpFake" + suf;
      gpFake.setAttribute("aria-haspopup", "true");
      var gpPop = el("div", "gp-pop"); gpPop.id = "gpPop" + suf;
      groups.forEach(function (g2, i2) {
        var it = el("button", "gp-opt" + (i2 === 0 ? " on" : ""));
        it.type = "button"; it.textContent = g2.name;
        it.onclick = function (ev) {
          ev.stopPropagation();
          if (parseInt(picker.value) !== i2) { picker.value = String(i2); picker.dispatchEvent(new Event("change")); }
          gpPop.classList.remove("open");
        };
        gpPop.appendChild(it);
      });
      gpFake.onclick = function (e) { e.stopPropagation(); gpPop.classList.toggle("open"); };
      document.addEventListener("click", function () { gpPop.classList.remove("open"); });
      gpPop.onclick = function (e) { e.stopPropagation(); };
      gpWrap.appendChild(gpFake); gpWrap.appendChild(gpPop);
      syncPickerUI();
      renderGallery(0);
    });
  }


  set("heroEyebrow", DATA.hero.eyebrow || "");
  set("heroBig", DATA.hero.big || "");
  set("heroSub", DATA.hero.sub || "");

  // ---------- journal（v61 函数化；v63 站内文章页） ----------
  function artContentOf(j) {
    if (!j) return "";
    if (curLang === "ja") return j.content_ja || j.content || "";
    if (curLang === "zh-CN") return j.content_zh || j.content || "";
    return j.content || "";
  }
  function renderJournal(root, d, suf) {
    if (!root) return;
    var sid = "journal" + (suf || "");
    qset(root, suf, "journalEyebrow", d.journalEyebrow || "");
    qset(root, suf, "journalTitle", d.journalTitle || "");
    qset(root, suf, "journalDesc", d.journalDesc || "");
    var jl = root.querySelector("#journalList" + suf); if (jl) jl.textContent = "";
    (d.journal || []).forEach(function (j, i) {
      if (!j || !j.title) return;
      var art = artContentOf(j);
      var row = el(art || j.href ? "a" : "div", "j-row");
      if (art) {
        row.href = "#article/" + sid + "/" + i;
      } else if (j.href) {
        row.href = j.href;
        if (j.href.charAt(0) === "#") {
          row.addEventListener("click", function (e) {
            e.preventDefault();
            var t = document.querySelector(j.href);
            if (t) { t.scrollIntoView({ behavior: "smooth" }); history.replaceState(null, "", location.pathname); }
          });
        } else { row.target = "_blank"; row.rel = "noopener"; }
      }
      row.appendChild(el("span", "j-date", j.date || ""));
      row.appendChild(el("span", "j-title", j.title));
      row.appendChild(el("span", "j-arrow", "↗"));
      jl.appendChild(row);
    });
  }

  // ---------- faq（v61 函数化） ----------
  function renderFaq(root, d, suf) {
    if (!root) return;
    qset(root, suf, "faqTitle", d.faqTitle || "Frequently Asked Questions");
    qset(root, suf, "faqEyebrow", d.faqEyebrow || "");
    qset(root, suf, "faqDesc", d.faqDesc || "");
    var fl = root.querySelector("#faqList" + suf); if (fl) fl.textContent = "";
    (d.faq || []).forEach(function (f) {
      var dd = el("details");
      dd.appendChild(el("summary", "faq-q", f.q));
      dd.appendChild(el("div", "a", f.a));
      fl.appendChild(dd);
    });
  }

  /* v61：cta 函数化 */
  function renderCta(root, d, suf) {
    if (!root) return;
    qset(root, suf, "ctaTitle", d.title);
    var cb = root.querySelector("#ctaBtns" + suf); if (cb) { cb.textContent = ""; cb.appendChild(storeBtn(d)); }
  }
  set("footBrand", DATA.footer.brand);
  var fl2 = document.getElementById("footLinks"); if (fl2) fl2.textContent = "";
  if (DATA.footer.privacyLabel) { var p1 = el("a", "", DATA.footer.privacyLabel); p1.href = DATA.footer.privacyHref; fl2.appendChild(p1); }
  if (DATA.footer.termsLabel) { var p2 = el("a", "", DATA.footer.termsLabel); p2.href = DATA.footer.termsHref; fl2.appendChild(p2); }
  set("footCopy", DATA.footer.copy);

  // ---------- 图片对比板块（v61 函数化：createCompareSec 支持 -N 实例） ----------
  function createCompareSec(cid, list) {
    if (!list || !list.length) return;
    if (document.getElementById(cid)) return;
    var cmpSec = document.createElement("section");
    cmpSec.className = "wrap compare-sec";
    cmpSec.id = cid;
    cmpSec.setAttribute("data-sec", cid);
    list.forEach(function (c) {
      if (!c.before || !c.after) return;
      var blk = el("div", "cmp-block");
      var frame = el("div", "cmp-frame");
      var after = el("img", "cmp-img"); after.src = c.after; after.alt = "";
      var before = el("img", "cmp-img cmp-before"); before.src = c.before; before.alt = "";
      var handle = el("div", "cmp-handle");
      frame.appendChild(after); frame.appendChild(before); frame.appendChild(handle);
      blk.appendChild(frame);
      if (c.caption) blk.appendChild(el("p", "cmp-cap", c.caption));
      cmpSec.appendChild(blk);
      function setPos(pct) {
        pct = Math.max(0, Math.min(100, pct));
        before.style.clipPath = "inset(0 " + (100 - pct) + "% 0 0)";
        handle.style.left = pct + "%";
      }
      function fromEvt(e) {
        var r = frame.getBoundingClientRect();
        var x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
        setPos(x / r.width * 100);
      }
      var drag = false;
      handle.addEventListener("pointerdown", function (e) { drag = true; try { handle.setPointerCapture(e.pointerId); } catch (err) {} fromEvt(e); e.preventDefault(); });
      handle.addEventListener("pointermove", function (e) { if (drag) { fromEvt(e); } });
      handle.addEventListener("pointerup", function () { drag = false; });
      handle.addEventListener("pointercancel", function () { drag = false; });
      var probe = new Image();
      probe.onload = function () { frame.style.aspectRatio = (probe.naturalWidth / probe.naturalHeight).toFixed(4); };
      probe.src = c.after;
      setPos(50);
    });
    var modsSec = document.getElementById("modules");
    if (modsSec && modsSec.parentNode) modsSec.parentNode.insertBefore(cmpSec, modsSec.nextSibling);
  }

  // ---------- 画廊图片点击放大（灯箱，事件委托：重渲染后依然有效） ----------
  var lb = document.createElement("div");
  lb.className = "lb";
  lb.innerHTML = '<img alt="">';
  document.body.appendChild(lb);
  lb.addEventListener("click", function () { lb.classList.remove("on"); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") lb.classList.remove("on"); });
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || t.tagName !== "IMG" || !t.closest) return;
    if (!t.closest('[id^="galleryPosts"]')) return;
    lb.querySelector("img").src = t.currentSrc || t.src;
    lb.classList.add("on");
  });

  // ---------- 板块自由排序（v61：含克隆实例分发与渲染） ----------
  function baseOf(id) { var m = /^(.+)-(\d+)$/.exec(id); return m ? m[1] : null; }
  var RENDERERS = { hero: renderHero, numbers: renderNumbers, features: renderFeatures, modules: renderModules, gallery: initGallery, journal: renderJournal, faq: renderFaq, cta: renderCta };
  /* compare 实例（含基础）动态创建 */
  (DATA.sections || []).forEach(function (id) {
    if (id === "compare" || baseOf(id) === "compare") {
      if (DATA[id] && (DATA[id] || []).length) createCompareSec(id, DATA[id]);
    }
  });
  /* 基础渲染调用（与原顺序渲染行为一致） */
  renderHero(document.getElementById("hero"), DATA.hero, "");
  renderNumbers(document.getElementById("numbers"), DATA.numbers, "");
  renderFeatures(document.getElementById("features"), DATA.intro2, "");
  renderModules(document.getElementById("modules"), DATA.modules, "");
  initGallery(document.getElementById("gallery"), { galleryTitle: DATA.galleryTitle, gallery: DATA.gallery }, "");
  renderJournal(document.getElementById("journal"), DATA, "");
  renderFaq(document.getElementById("faq"), DATA, "");
  renderCta(document.getElementById("download"), DATA.cta, "");
  /* v61：克隆实例——复制已渲染好的模板板块，子 id 加后缀，用实例数据重渲染 */
  function makeClone(id) {
    var base = baseOf(id);
    var tpl = base ? document.getElementById(base) : null;
    if (!tpl || !RENDERERS[base]) return null;
    var clone = tpl.cloneNode(true);
    clone.id = id;
    clone.setAttribute("data-sec", id);
    var suf = id.slice(base.length);
    Array.prototype.forEach.call(clone.querySelectorAll("[id]"), function (n) { n.id = n.id + suf; });
    document.body.appendChild(clone);
    var d = DATA[id];
    if (d) { try { RENDERERS[base](clone, d, suf); } catch (e) {} }
    return clone;
  }
  if (DATA.sections && DATA.sections.length) {
    var secs = DATA.sections.slice();
    if (secs.indexOf("journal") < 0) { var fqi = secs.indexOf("faq"); secs.splice(fqi < 0 ? secs.length : fqi, 0, "journal"); }
    var cursor = document.querySelector("header.nav");
    secs.forEach(function (id) {
      var sec = document.getElementById(id);
      if (!sec && baseOf(id)) sec = makeClone(id);
      if (sec && cursor) { cursor.insertAdjacentElement("afterend", sec); cursor = sec; }
    });
  }

  // ---------- v63 站内文章详情页（#article/<sid>/<i> hash 路由，同页视图切换） ----------
  var artView = null;
  function journalDataOf(sid) {
    var d = DATA[sid];
    if (d && d.journal) return d.journal;
    return DATA.journal || [];
  }
  function ensureArtView() {
    if (artView) return artView;
    artView = document.createElement("section");
    artView.className = "article-view";
    artView.style.display = "none";
    var foot = document.querySelector("footer");
    if (foot && foot.parentNode) foot.parentNode.insertBefore(artView, foot);
    else document.body.appendChild(artView);
    artView.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest(".art-back")) {
        hideArticle();            /* 先恢复板块显示，原生锚点滚动才生效 */
        location.hash = "journal";
      }
    });
    return artView;
  }
  function escArt(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function showArticle(sid, i) {
    var list = journalDataOf(sid);
    var j = list && list[i];
    var content = artContentOf(j);
    if (!j || !j.title || !content) { hideArticle(); return; }
    var secs = document.querySelectorAll("section[data-sec]");
    for (var k = 0; k < secs.length; k++) secs[k].style.display = "none";
    var v = ensureArtView();
    var plain = content.replace(/<[^>]+>/g, " ");
    var words = (plain.trim().match(/\S+/g) || []).length;
    var cjk = (plain.match(/[\u4e00-\u9fff]/g) || []).length;
    var mins = Math.max(1, Math.round(words / 200 + cjk / 400));
    var brief = j.title.length > 38 ? j.title.slice(0, 38) + "…" : j.title;
    v.innerHTML =
      '<div class="wrap art-wrap">' +
        '<div class="art-top"><button class="art-back" type="button">← BACK</button>' +
        '<span class="art-brand">' + escArt(DATA.journalTitle || "TONEBY JOURNAL") + '</span></div>' +
        '<div class="art-crumb"><span>JOURNAL</span> <span class="art-sep">//</span> <span class="art-crumb-title">' + escArt(brief) + '</span></div>' +
        '<div class="art-meta"><span class="art-tag">ARTICLE</span>' +
        '<span class="art-sub">' + escArt(j.date || "") + '</span>' +
        '<span class="art-sub">' + mins + ' MIN READ</span>' +
        '<span class="art-sub art-rt">// READ TIME ' + mins + ' MIN</span></div>' +
        '<h1 class="art-h1">' + escArt(j.title) + '</h1>' +
        '<div class="art-body">' + content + '</div>' +
      '</div>';
    v.style.display = "block";
    window.scrollTo(0, 0);
  }
  function hideArticle() {
    if (!artView || artView.style.display === "none") return;
    artView.style.display = "none";
    artView.innerHTML = "";
    var secs = document.querySelectorAll("section[data-sec]");
    for (var k = 0; k < secs.length; k++) secs[k].style.display = "";
  }
  function onHashArt() {
    var m = /^#article\/([\w-]+)\/(\d+)$/.exec(location.hash || "");
    if (m) showArticle(m[1], parseInt(m[2], 10));
    else hideArticle();
  }
  window.addEventListener("hashchange", onHashArt);
  onHashArt();

  // ---------- 板块字体缩放（后台可调，作用于每个板块根元素） ----------
  try {
    var fs = DATA.uiFontScale;
    if (fs && typeof fs === "object") {
      Object.keys(fs).forEach(function (sid) {
        var el2 = document.getElementById(sid);
        var v2 = parseFloat(fs[sid]);
        if (el2 && v2 && v2 > 0.3 && v2 <= 2.5) el2.style.zoom = String(v2);
      });
    }
  } catch (e0) {}

  // ---------- 后台预览模式（被 admin.html 内嵌时）：拦截跳转/交互 + 板块点选上报 ----------
  try {
    if (window.parent && window.parent !== window) {
      var st = document.createElement("style");
      st.textContent = ".adm-hot{outline:2px dashed #f95c48 !important;outline-offset:-2px !important;cursor:pointer !important}" +
        ".adm-sec:hover{outline:2px dashed rgba(249,92,72,.65) !important;outline-offset:-2px !important;cursor:pointer !important}" +
        ".adm-pick{position:absolute;z-index:2147483000;background:#f95c48;color:#fff;font:700 11px/1 system-ui;padding:5px 9px;border-radius:3px;pointer-events:none}";
      document.head.appendChild(st);
      Array.prototype.forEach.call(document.querySelectorAll("[data-sec]"), function (el3) { el3.classList.add("adm-sec"); });
      /* 拦截一切会跳转/改变状态的交互（后台里点击只用于选中板块） */
      document.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var t = e.target;
        var sec = t && t.closest ? t.closest("[data-sec], section[id], header.nav") : null;
        var sid = sec ? (sec.getAttribute("data-sec") || sec.id) : "";
        if (parent.postMessage) parent.postMessage({ t: "adm-select", id: sid }, "*");
      }, true);
      document.addEventListener("submit", function (e) { e.preventDefault(); }, true);
      if (parent.postMessage) parent.postMessage({ t: "adm-ready" }, "*");
    }
  } catch (e0) {}


  // ---------- 滚动动画系统（追赶入场 + 离屏变灰） ----------
  if (!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    var revealEls = [];
    ["numbersGrid", "galleryPosts", "journalList", "faqList"].forEach(function (id2) {
      var n2 = document.getElementById(id2);
      if (n2) Array.prototype.forEach.call(n2.children, function (c2) { revealEls.push(c2); });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".mod-block, .cmp-block"), function (x2) { revealEls.push(x2); });
    revealEls.forEach(function (elx, ix2) {
      elx.classList.add("reveal");
      elx.style.setProperty("--rd", (ix2 % 3) * 90 + "ms");
    });
    var io2 = new IntersectionObserver(function (ents) {
      ents.forEach(function (en2) {
        if (en2.isIntersecting) { en2.target.classList.add("revealed"); io2.unobserve(en2.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
    revealEls.forEach(function (elx) { io2.observe(elx); });
    var dimTick = false;
    function dimUpdate() {
      dimTick = false;
      var vh = window.innerHeight;
      revealEls.forEach(function (elx) {
        if (!elx.classList.contains("revealed")) return;
        var r = elx.getBoundingClientRect();
        elx.classList.remove("dim-top", "dim-pre");
        if (r.bottom < vh * 0.18) elx.classList.add("dim-top");
        else if (r.top > vh * 0.96) elx.classList.add("dim-pre");
      });
    }
    window.addEventListener("scroll", function () {
      if (!dimTick) { dimTick = true; requestAnimationFrame(dimUpdate); }
    }, { passive: true });
    dimUpdate();
  }
window.__SITE_BOOTED = true;

})();
