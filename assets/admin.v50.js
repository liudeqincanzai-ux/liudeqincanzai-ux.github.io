// 统一后台 v46：Spotify 式编辑模式（左板块列表 / 中预览 / 右抽屉编辑）
(function () {
  var SAVE_KEY = "lut_web_edits_v1";
  var PASS_KEY = "lut_site_admin_pass";
  var TOKEN_KEY = "lut_gh_token";
  var REPO = "liudeqincanzai-ux/liudeqincanzai-ux.github.io";

  window.onerror = function (msg, src, line) {
    var b = document.getElementById("errBanner");
    if (!b) return;
    b.style.display = "block";
    b.textContent = "脚本错误: " + msg + " @" + (src || "").split("/").pop() + ":" + line;
  };

  var gateEl = document.getElementById("gate");
  var appEl = document.getElementById("app");

  function getPassword() {
    try { return localStorage.getItem(PASS_KEY) || "toneby"; } catch (e) { return "toneby"; }
  }
  function getToken() {
    try { return (localStorage.getItem(TOKEN_KEY) || "").trim(); } catch (e) { return ""; }
  }
  function setToken(t) {
    try {
      if (t && t.trim()) localStorage.setItem(TOKEN_KEY, t.trim());
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }

  // ---------- 数据 ----------
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
  var pending = {};
  var objUrls = {};
  try {
    var s = JSON.parse(localStorage.getItem(SAVE_KEY));
    DATA = mergeDeep(JSON.parse(JSON.stringify(SITE_WEB)), (s && s.site) ? s.site : null);
  } catch (e) { DATA = JSON.parse(JSON.stringify(SITE_WEB)); }
  if (!DATA.uiFontScale || typeof DATA.uiFontScale !== "object") DATA.uiFontScale = {};
  if (!DATA.sections || !DATA.sections.length) DATA.sections = ["hero", "numbers", "features", "modules", "compare", "gallery", "journal", "faq", "cta"];
  if (DATA.sections.indexOf("journal") < 0) {
    var fqi = DATA.sections.indexOf("faq");
    DATA.sections.splice(fqi < 0 ? DATA.sections.length : fqi, 0, "journal");
  }
  function saveQuiet() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ site: DATA })); } catch (e) {}
  }

  // ---------- 密码门 ----------
  var passInput = document.getElementById("gatePass");
  var gateErr = document.getElementById("gateErr");
  function enter() {
    if (passInput.value === getPassword()) {
      try { sessionStorage.setItem("lut_admin_unlocked", "1"); } catch (e) {}
      gateEl.style.display = "none";
      appEl.style.display = "flex";
      appEl.style.flexDirection = "column";
      start();
    } else {
      gateErr.textContent = "密码不对，再试一次";
      passInput.value = "";
    }
  }
  document.getElementById("gateBtn").onclick = enter;
  passInput.addEventListener("keydown", function (e) { if (e.key === "Enter") enter(); });
  /* 自动解锁已移至脚本末尾：等所有 DOM 变量初始化完成后再进后台（修复刷新后空白的真正根因） */

  // ---------- 首次连接 GitHub 弹窗 ----------
  function showTokenModal(afterSave) {
    var overlay = document.createElement("div");
    overlay.className = "gate";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;";
    var box = document.createElement("div");
    box.className = "gate-box";
    box.style.textAlign = "left";
    var h = document.createElement("h1");
    h.textContent = "连接 GitHub（官网同步用）";
    box.appendChild(h);
    var steps = document.createElement("p");
    steps.className = "gate-hint";
    steps.style.textAlign = "left";
    steps.innerHTML = "官网数据保存在主仓库（liudeqincanzai-ux.github.io），你的令牌需要先授权它：<br>"
      + "1. 打开 GitHub 令牌页，点进「Toneby LUT 编辑器 永久」<br>"
      + "2. 找到「存储库访问」，点「更新」，把 <b>liudeqincanzai-ux.github.io</b> 也加入勾选<br>"
      + "3. 拉到底点 Update 保存（令牌串不变）";
    box.appendChild(steps);
    var linkBtn = document.createElement("button");
    linkBtn.type = "button";
    linkBtn.style.cssText = "width:100%;margin-bottom:12px;";
    linkBtn.textContent = "① 打开我的令牌列表";
    linkBtn.onclick = function () { window.open("https://github.com/settings/personal-access-tokens", "_blank"); };
    box.appendChild(linkBtn);
    var input = document.createElement("input");
    input.type = "password";
    input.placeholder = "（可选）重新粘贴令牌串";
    box.appendChild(input);
    var errP = document.createElement("p");
    errP.className = "gate-err";
    box.appendChild(errP);
    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "② 已更新，保存并同步官网";
    saveBtn.onclick = function () {
      if (input.value.trim()) setToken(input.value);
      overlay.remove();
      afterSave();
    };
    box.appendChild(saveBtn);
    var later = document.createElement("a");
    later.className = "bar-link";
    later.href = "#";
    later.style.cssText = "display:block;margin-top:10px;";
    later.textContent = "稍后再连（内容仍自动保存在本机）";
    later.onclick = function (e) { e.preventDefault(); overlay.remove(); };
    box.appendChild(later);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  // ---------- 工具 ----------
  var toastEl = document.getElementById("toast");
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }
  function field(label, hint, value, onChange, rows) {
    var wrap = document.createElement("div");
    wrap.className = "field";
    var lab = document.createElement("label");
    lab.textContent = label;
    if (hint) {
      var h = document.createElement("span");
      h.className = "hint";
      h.textContent = "（" + hint + "）";
      lab.appendChild(h);
    }
    var input = document.createElement(rows ? "textarea" : "input");
    if (rows) input.rows = rows; else input.type = "text";
    input.value = value || "";
    input.oninput = function () { onChange(input.value); };
    wrap.appendChild(lab);
    wrap.appendChild(input);
    return wrap;
  }
  function shrinkImage(file, cb) {
    var url = URL.createObjectURL(file);
    var im = new Image();
    im.onload = function () {
      URL.revokeObjectURL(url);
      var scale = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
      if (scale >= 1 && file.size < 500 * 1024) { cb(file); return; }
      var c = document.createElement("canvas");
      c.width = Math.round(im.naturalWidth * scale);
      c.height = Math.round(im.naturalHeight * scale);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      c.toBlob(function (blob) {
        if (!blob) { cb(file); return; }
        var outName = file.name.replace(/\.(png|webp|jpeg|jpg)$/i, ".jpg");
        cb(new File([blob], outName, { type: "image/jpeg" }));
      }, "image/jpeg", 0.82);
    };
    im.onerror = function () { URL.revokeObjectURL(url); cb(file); };
    im.src = url;
  }
  function imagePicker(currentSrc, onPick) {
    var wrap = document.createElement("div");
    wrap.className = "img-pick";
    var img = document.createElement("img");
    img.className = "thumb";
    img.style.cssText = "width:84px;height:57px;object-fit:cover;border-radius:3px;background:#111;border:1px solid #333;";
    img.src = objUrls[currentSrc] || currentSrc || "";
    wrap.appendChild(img);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pickbtn";
    btn.textContent = "更换图片";
    var fi = document.createElement("input");
    fi.type = "file"; fi.accept = "image/*"; fi.style.display = "none";
    fi.onchange = function () {
      var f = fi.files && fi.files[0];
      if (!f) return;
      shrinkImage(f, function (out) {
        var path = "assets/shots/" + out.name;
        objUrls[path] = URL.createObjectURL(out);
        pending[path] = out;
        img.src = objUrls[path];
        onPick(path);
        toast("图片已更换 ✓ 同步时上传");
      });
      fi.value = "";
    };
    btn.onclick = function () { fi.click(); };
    wrap.appendChild(btn);
    wrap.appendChild(fi);
    return wrap;
  }

  // ---------- 标签页 ----------
  var btnWeb = document.getElementById("btnWeb");
  var btnLut = document.getElementById("btnLut");
  var webPane = document.getElementById("webPane");
  var lutPane = document.getElementById("lutPane");
  btnWeb.onclick = function () {
    btnWeb.classList.add("active"); btnLut.classList.remove("active");
    webPane.style.display = "flex"; lutPane.style.display = "none";
  };
  btnLut.onclick = function () {
    btnLut.classList.add("active"); btnWeb.classList.remove("active");
    lutPane.style.display = "block"; webPane.style.display = "none";
  };

  // 隐藏 iframe 内 LUT 编辑器自带的按钮组
  var lutFrame = document.getElementById("lutFrame");
  function bind(id, fn) { var el = document.getElementById(id); if (el) fn(el); return el; }
  function injectHide() {
    try {
      var d = lutFrame.contentDocument;
      if (!d || !d.getElementById) return;
      if (d.getElementById("adminHideStyle")) return;
      var st = d.createElement("style");
      st.id = "adminHideStyle";
      st.textContent = ".edit-bar .bar-actions { display:none !important; }";
      (d.head || d.body).appendChild(st);
    } catch (e) {}
  }
  if (lutFrame) lutFrame.addEventListener("load", injectHide);
  setInterval(injectHide, 2000);

  // ---------- 板块元数据 ----------
  function svgIco(inner) {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + inner + "</svg>";
  }
  var SECTIONS_META = {
    hero:     { name: "首屏轮播", ico: svgIco('<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 15l5-5 4 4 3-3 6 6"/>') },
    numbers:  { name: "巨号数字", ico: svgIco('<path d="M6 4v16M12 4v16M18 4v16"/><path d="M6 8h6M12 14h6"/>') },
    features: { name: "功能标题", ico: svgIco('<path d="M4 6h16M4 12h10M4 18h13"/>') },
    modules:  { name: "图片展示", ico: svgIco('<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>') },
    compare:  { name: "图片对比", ico: svgIco('<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M12 4v14"/><path d="M8 10l-2 2 2 2M16 10l2 2-2 2"/>') },
    gallery:  { name: "LUT 画廊", ico: svgIco('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5-11 11"/>') },
    journal:  { name: "文章板块", ico: svgIco('<path d="M6 3h9l5 5v13H6z"/><path d="M14 3v6h6M9 13h6M9 17h6"/>') },
    faq:      { name: "常见问题", ico: svgIco('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.8.3-1.4 1-1.4 1.9"/><path d="M12 17h.01"/>') },
    cta:      { name: "下载号召", ico: svgIco('<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/>') },
    settings: { name: "站点与法务设置", ico: svgIco('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>') }
  };

  // ---------- 预览控制 ----------
  var previewFrame = document.getElementById("previewFrame");
  if (previewFrame) {
  var pvRefreshTimer = null;
  function pvRefreshSoon() {
    clearTimeout(pvRefreshTimer);
    pvRefreshTimer = setTimeout(function () {
      try { previewFrame.contentWindow.location.reload(); } catch (e) {}
    }, 900);
  }
  function pvGoto(id) {
    try {
      var d = previewFrame.contentDocument;
      if (!d) return;
      var target = id === "cta" ? "download" : id;
      var el = d.getElementById(target);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {}
  }
  window.addEventListener("message", function (e) {
    if (!e.data || e.data.t !== "adm-select") return;
    selectSection(e.data.id || "hero");
  }); }

  // ---------- 左侧板块列表 ----------
  var secList = document.getElementById("secList");
  var HAS_NEW_SHELL = !!secList;
  var currentSec = null;
  function renderSecList() {
    secList.textContent = "";
    DATA.sections.forEach(function (id, i) {
      var meta = SECTIONS_META[id];
      if (!meta) return;
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sec-item" + (currentSec === id ? " active" : "");
      btn.innerHTML = '<span class="ico">' + meta.ico + '</span><span class="nm">' + meta.name + "</span>";
      var ord = document.createElement("span");
      ord.className = "ord";
      [["↑", function () { if (i > 0) { var t = DATA.sections[i - 1]; DATA.sections[i - 1] = DATA.sections[i]; DATA.sections[i] = t; afterOrder(); } }],
       ["↓", function () { if (i < DATA.sections.length - 1) { var t = DATA.sections[i + 1]; DATA.sections[i + 1] = DATA.sections[i]; DATA.sections[i] = t; afterOrder(); } }]
      ].forEach(function (d) {
        var ob = document.createElement("button");
        ob.type = "button"; ob.textContent = d[0]; ob.onclick = d[1];
        ord.appendChild(ob);
      });
      btn.appendChild(ord);
      btn.onclick = function () { selectSection(id); };
      li.appendChild(btn);
      secList.appendChild(li);
    });
  }
  function afterOrder() {
    saveQuiet();
    renderSecList();
    pvRefreshSoon();
    toast("板块顺序已调整 ✓");
  }

  // ---------- 添加板块 ----------
  var addSecBtn = document.getElementById("addSec");
  var addMenu = document.getElementById("addMenu");
  var addMenu = document.getElementById("addMenu");
  if (addSecBtn && addMenu) addSecBtn.onclick = function () {
    if (addMenu.style.display === "none") {
      addMenu.textContent = "";
      Object.keys(SECTIONS_META).forEach(function (id) {
        if (id === "settings") return;
        var b = document.createElement("button");
        b.type = "button";
        b.innerHTML = '<span class="ico">' + SECTIONS_META[id].ico + "</span>" + SECTIONS_META[id].name;
        b.onclick = function () {
          if (DATA.sections.indexOf(id) >= 0) {
            toast("「" + SECTIONS_META[id].name + "」已在页面中");
          } else {
            DATA.sections.push(id);
            saveQuiet();
            renderSecList();
            pvRefreshSoon();
            toast("已添加「" + SECTIONS_META[id].name + "」✓ 同步后前台生效");
          }
          addMenu.style.display = "none";
        };
        addMenu.appendChild(b);
      });
      addMenu.style.display = "block";
    } else addMenu.style.display = "none";
  };

  // ---------- 右侧编辑抽屉 ----------
  var drawer = document.getElementById("drawer");
  var drawerTitle = document.getElementById("drawerTitle");
  var drawerBody = document.getElementById("drawerBody");
  bind("drawerClose", function (el) { el.onclick = function () {
    drawer.classList.remove("open");
    currentSec = null;
    if (secList) renderSecList();
  }; });
  function h2(t) { var e = document.createElement("h2"); e.textContent = t; return e; }
  function fsSlider(id) {
    var cur = Math.round((parseFloat(DATA.uiFontScale[id]) || 1) * 100);
    var wrap = document.createElement("div");
    wrap.className = "fs-row";
    var lab = document.createElement("span");
    lab.className = "fs-label";
    lab.textContent = "板块字体大小";
    var rng = document.createElement("input");
    rng.type = "range"; rng.min = "80"; rng.max = "140"; rng.step = "5"; rng.value = String(cur);
    var val = document.createElement("span");
    val.className = "fs-val"; val.textContent = cur + "%";
    rng.oninput = function () {
      var v = parseInt(rng.value, 10);
      val.textContent = v + "%";
      DATA.uiFontScale[id] = v / 100;
      saveQuiet();
      try {
        var el = previewFrame.contentDocument.getElementById(id);
        if (el) el.style.zoom = String(v / 100);
      } catch (e) {}
    };
    wrap.appendChild(lab); wrap.appendChild(rng); wrap.appendChild(val);
    return wrap;
  }
  function card(headText) {
    var card = document.createElement("div");
    card.className = "item-card";
    if (headText) {
      var head = document.createElement("div");
      head.className = "item-head";
      head.appendChild(Object.assign(document.createElement("span"), { className: "t", textContent: headText }));
      card.appendChild(head);
    }
    return card;
  }
  function opsBtns(host, defs) {
    var ops = document.createElement("span");
    ops.className = "ops";
    defs.forEach(function (d) {
      var b = document.createElement("button");
      b.textContent = d[0];
      if (d[2]) b.className = "danger";
      b.onclick = d[1];
      ops.appendChild(b);
    });
    host.appendChild(ops);
  }
  function addBtn(text, fn) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "add-btn"; b.textContent = text;
    b.onclick = fn;
    return b;
  }

  var DRAWERS = {
    hero: function (root) {
      root.appendChild(fsSlider("hero"));
      root.appendChild(h2("品牌与导航"));
      root.appendChild(field("网站标识（左上角）", "", DATA.nav.brand, function (v) { DATA.nav.brand = v; }));
      root.appendChild(imagePicker(DATA.nav.logoSrc || "", function (p) { DATA.nav.logoSrc = p; saveQuiet(); pvRefreshSoon(); toast("图标已更换 ✓"); }));
      root.appendChild(addBtn("恢复默认黑色 T 图标", function () { DATA.nav.logoSrc = ""; saveQuiet(); renderDrawer("hero"); pvRefreshSoon(); toast("已恢复默认图标"); }));
      root.appendChild(field("下载按钮文字", "", DATA.nav.downloadLabel, function (v) { DATA.nav.downloadLabel = v; }));
      root.appendChild(h2("HERO 主视觉"));
      root.appendChild(field("小标（等宽字）", "", DATA.hero.meta, function (v) { DATA.hero.meta = v; }));
      root.appendChild(field("顶部眉行小字", "", DATA.hero.eyebrow || "", function (v) { DATA.hero.eyebrow = v; }));
      root.appendChild(field("大字标题", "建议 TONEBY", DATA.hero.big || "", function (v) { DATA.hero.big = v; }));
      root.appendChild(field("大字下方小字", "", DATA.hero.sub || "", function (v) { DATA.hero.sub = v; }));
      root.appendChild(field("介绍段落", "", DATA.hero.intro, function (v) { DATA.hero.intro = v; }, 4));
      var r2 = document.createElement("div"); r2.className = "row2";
      r2.appendChild(field("下载按钮小字", "", DATA.hero.playLabel, function (v) { DATA.hero.playLabel = v; }));
      r2.appendChild(field("下载按钮商店名", "", DATA.hero.playStore, function (v) { DATA.hero.playStore = v; }));
      root.appendChild(r2);
      root.appendChild(field("Google Play 链接", "", DATA.hero.playUrl, function (v) { DATA.hero.playUrl = v; }));
      root.appendChild(h2("轮播截图"));
      (DATA.hero.slides || []).forEach(function (s, i) {
        var cd = card("截图 " + (i + 1));
        opsBtns(cd.querySelector(".item-head"), [
          ["↑", function () { if (i > 0) { var t = DATA.hero.slides[i - 1]; DATA.hero.slides[i - 1] = DATA.hero.slides[i]; DATA.hero.slides[i] = t; saveQuiet(); renderDrawer("hero"); pvRefreshSoon(); } }],
          ["↓", function () { if (i < DATA.hero.slides.length - 1) { var t = DATA.hero.slides[i + 1]; DATA.hero.slides[i + 1] = DATA.hero.slides[i]; DATA.hero.slides[i] = t; saveQuiet(); renderDrawer("hero"); pvRefreshSoon(); } }],
          ["删除", function () { DATA.hero.slides.splice(i, 1); saveQuiet(); renderDrawer("hero"); pvRefreshSoon(); }, 1]
        ]);
        cd.appendChild(imagePicker(s.src, function (p) { s.src = p; saveQuiet(); pvRefreshSoon(); }));
        cd.appendChild(field("下方标注文字", "", s.cap, function (v) { s.cap = v; }));
        cd.appendChild(field("所属分组 (0/1/2)", "", String(s.g), function (v) { s.g = parseInt(v) || 0; }));
        root.appendChild(cd);
      });
      var shotInput = document.createElement("input");
      shotInput.type = "file"; shotInput.accept = "image/*"; shotInput.multiple = true; shotInput.style.display = "none";
      var addShot = addBtn("＋ 添加轮播截图（可多选，自动压缩）", function () { shotInput.click(); });
      shotInput.onchange = function () {
        var files = Array.prototype.slice.call(shotInput.files || []);
        var left = files.length;
        if (!left) return;
        files.forEach(function (f) {
          shrinkImage(f, function (out) {
            var path = "assets/shots/" + out.name;
            objUrls[path] = URL.createObjectURL(out);
            pending[path] = out;
            DATA.hero.slides.push({ src: path, cap: "", g: 0 });
            saveQuiet(); renderDrawer("hero"); pvRefreshSoon();
            left--;
            if (left === 0) toast("截图已添加 ✓ 同步时上传");
          });
        });
        shotInput.value = "";
      };
      root.appendChild(addShot); root.appendChild(shotInput);
      root.appendChild(h2("右侧分组标签"));
      (DATA.hero.groups || []).forEach(function (g, i) {
        var r = document.createElement("div"); r.className = "row2";
        r.appendChild(field("编号 " + (i + 1), "如 — 01", g.no, function (v) { g.no = v; }));
        r.appendChild(field("标签文字 " + (i + 1), "", g.label, function (v) { g.label = v; }));
        root.appendChild(r);
      });
    },
    numbers: function (root) {
      root.appendChild(fsSlider("numbers"));
      (DATA.numbers || []).forEach(function (n, i) {
        var cd = card("数字块 " + (i + 1));
        cd.appendChild(field("编号", "如 01", n.no, function (v) { n.no = v; }));
        cd.appendChild(field("标题", "", n.title, function (v) { n.title = v; }));
        cd.appendChild(field("描述", "", n.desc, function (v) { n.desc = v; }, 2));
        root.appendChild(cd);
      });
    },
    features: function (root) {
      root.appendChild(fsSlider("features"));
      root.appendChild(field("小标", "", DATA.intro2.tag, function (v) { DATA.intro2.tag = v; }));
      root.appendChild(field("标题", "", DATA.intro2.title, function (v) { DATA.intro2.title = v; }));
      root.appendChild(field("描述", "", DATA.intro2.desc, function (v) { DATA.intro2.desc = v; }, 3));
    },
    modules: function (root) {
      root.appendChild(fsSlider("modules"));
      (DATA.modules || []).forEach(function (m, i) {
        var cd = card("模块 " + (i + 1));
        cd.appendChild(field("MODULE 编号", "如 MODULE01（清空则不显示）", m.mod, function (v) { m.mod = v; }));
        cd.appendChild(field("图注小字（FIG）", "如 FIG. 01 // 05", m.fig || "", function (v) { m.fig = v; }));
        cd.appendChild(field("标题", "", m.title, function (v) { m.title = v; }));
        cd.appendChild(field("描述", "", m.desc, function (v) { m.desc = v; }, 3));
        cd.appendChild(imagePicker(m.src, function (p) { m.src = p; saveQuiet(); pvRefreshSoon(); }));
        root.appendChild(cd);
      });
    },
    compare: function (root) {
      root.appendChild(fsSlider("compare"));
      (DATA.compare || []).forEach(function (c, i) {
        var cd = card("对比板块 " + (i + 1));
        cd.appendChild(field("左侧图（对比前）路径", "如 assets/shots/xx.jpg", c.before || "", function (v) { c.before = v; }));
        cd.appendChild(imagePicker(c.before || "", function (p) { c.before = p; saveQuiet(); pvRefreshSoon(); }));
        cd.appendChild(field("右侧图（对比后）路径", "", c.after || "", function (v) { c.after = v; }));
        cd.appendChild(imagePicker(c.after || "", function (p) { c.after = p; saveQuiet(); pvRefreshSoon(); }));
        cd.appendChild(field("说明文字（可空）", "", c.caption || "", function (v) { c.caption = v; }));
        cd.appendChild(addBtn("删除此对比板块", function () { DATA.compare.splice(i, 1); saveQuiet(); renderDrawer("compare"); pvRefreshSoon(); }));
        root.appendChild(cd);
      });
      root.appendChild(addBtn("＋ 添加对比板块", function () { DATA.compare.push({ before: "", after: "", caption: "" }); saveQuiet(); renderDrawer("compare"); pvRefreshSoon(); }));
    },
    gallery: function (root) {
      root.appendChild(fsSlider("gallery"));
      root.appendChild(field("画廊区块标题", "", DATA.galleryTitle || "LUT Gallery", function (v) { DATA.galleryTitle = v; }));
      root.appendChild(field("画廊描述", "", (DATA.gallery && DATA.gallery.desc) || "", function (v) { if (!DATA.gallery) DATA.gallery = {}; DATA.gallery.desc = v; }, 3));
      root.appendChild(field("画廊分组下拉里的说明文字", "展示组来自 LUT 展示编辑", "", function () {}, 1)).style.display = "none";
    },
    journal: function (root) {
      root.appendChild(fsSlider("journal"));
      root.appendChild(field("眉行小字", "左上角", DATA.journalEyebrow || "", function (v) { DATA.journalEyebrow = v; }));
      root.appendChild(field("大字标题", "", DATA.journalTitle || "", function (v) { DATA.journalTitle = v; }));
      root.appendChild(field("描述", "", DATA.journalDesc || "", function (v) { DATA.journalDesc = v; }, 3));
      (DATA.journal || []).forEach(function (j, i) {
        var cd = card("文章 " + (i + 1));
        opsBtns(cd.querySelector(".item-head"), [
          ["↑", function () { if (i > 0) { var t = DATA.journal[i - 1]; DATA.journal[i - 1] = DATA.journal[i]; DATA.journal[i] = t; saveQuiet(); renderDrawer("journal"); pvRefreshSoon(); } }],
          ["↓", function () { if (i < DATA.journal.length - 1) { var t = DATA.journal[i + 1]; DATA.journal[i + 1] = DATA.journal[i]; DATA.journal[i] = t; saveQuiet(); renderDrawer("journal"); pvRefreshSoon(); } }],
          ["删除", function () { DATA.journal.splice(i, 1); saveQuiet(); renderDrawer("journal"); pvRefreshSoon(); }, 1]
        ]);
        cd.appendChild(field("日期", "如 2026.06.06（可空）", j.date || "", function (v) { j.date = v; }));
        cd.appendChild(field("标题", "", j.title || "", function (v) { j.title = v; }, 2));
        cd.appendChild(field("链接", "可空=不可点；#faq 站内锚点，https:// 外链", j.href || "", function (v) { j.href = v; }));
        root.appendChild(cd);
      });
      root.appendChild(addBtn("＋ 添加一篇文章", function () { DATA.journal.push({ date: "2026.06.06", title: "NEW ARTICLE TITLE", href: "" }); saveQuiet(); renderDrawer("journal"); pvRefreshSoon(); }));
    },
    faq: function (root) {
      root.appendChild(fsSlider("faq"));
      root.appendChild(field("眉行小字", "", DATA.faqEyebrow || "", function (v) { DATA.faqEyebrow = v; }));
      root.appendChild(field("板块描述", "", DATA.faqDesc || "", function (v) { DATA.faqDesc = v; }, 3));
      (DATA.faq || []).forEach(function (f, i) {
        var cd = card("问题 " + (i + 1));
        opsBtns(cd.querySelector(".item-head"), [
          ["↑", function () { if (i > 0) { var t = DATA.faq[i - 1]; DATA.faq[i - 1] = DATA.faq[i]; DATA.faq[i] = t; saveQuiet(); renderDrawer("faq"); pvRefreshSoon(); } }],
          ["↓", function () { if (i < DATA.faq.length - 1) { var t = DATA.faq[i + 1]; DATA.faq[i + 1] = DATA.faq[i]; DATA.faq[i] = t; saveQuiet(); renderDrawer("faq"); pvRefreshSoon(); } }],
          ["删除", function () { DATA.faq.splice(i, 1); saveQuiet(); renderDrawer("faq"); pvRefreshSoon(); }, 1]
        ]);
        cd.appendChild(field("问题", "", f.q, function (v) { f.q = v; }));
        cd.appendChild(field("回答", "", f.a, function (v) { f.a = v; }, 3));
        root.appendChild(cd);
      });
      root.appendChild(addBtn("＋ 添加一条 FAQ", function () { DATA.faq.push({ q: "新问题？", a: "回答内容" }); saveQuiet(); renderDrawer("faq"); pvRefreshSoon(); }));
    },
    cta: function (root) {
      root.appendChild(fsSlider("cta"));
      root.appendChild(field("CTA 标语", "", DATA.cta.title, function (v) { DATA.cta.title = v; }));
      root.appendChild(field("页脚品牌名", "", DATA.footer.brand, function (v) { DATA.footer.brand = v; }));
      var r3 = document.createElement("div"); r3.className = "row2";
      r3.appendChild(field("隐私政策链接文字", "", DATA.footer.privacyLabel, function (v) { DATA.footer.privacyLabel = v; }));
      r3.appendChild(field("用户协议链接文字", "", DATA.footer.termsLabel, function (v) { DATA.footer.termsLabel = v; }));
      root.appendChild(r3);
      root.appendChild(field("版权行", "", DATA.footer.copy, function (v) { DATA.footer.copy = v; }));
    },
    settings: function (root) {
      root.appendChild(h2("站点与标题"));
      root.appendChild(field("网站名称（浏览器标签标题）", "", DATA.siteTitle || "Toneby", function (v) { DATA.siteTitle = v; }));
      root.appendChild(h2("隐私政策页面内容"));
      if (!DATA.legal) DATA.legal = {};
      root.appendChild(field("页面标题", "", DATA.legal.privacyTitle, function (v) { DATA.legal.privacyTitle = v; }));
      root.appendChild(field("页面内容（HTML）", "支持 <h3>/<p>/<strong> 等标签", DATA.legal.privacyContent, function (v) { DATA.legal.privacyContent = v; }, 10));
      root.appendChild(h2("用户协议页面内容"));
      root.appendChild(field("页面标题", "", DATA.legal.termsTitle, function (v) { DATA.legal.termsTitle = v; }));
      root.appendChild(field("页面内容（HTML）", "支持 <h2>/<p>/<em> 等标签", DATA.legal.termsContent, function (v) { DATA.legal.termsContent = v; }, 10));
      root.appendChild(h2("GitHub Token"));
      root.appendChild(field("令牌", "官网同步与 LUT 同步共用", "", function (v) {
        if (v && v.trim()) { setToken(v); toast("Token 已保存 ✓"); }
      }));
      root.appendChild(h2("自动翻译（日语 / 简体中文）"));
      var tg = document.createElement("label");
      tg.style.cssText = "display:flex;align-items:center;gap:8px;color:#ddd;font-size:13px;cursor:pointer";
      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = DATA.autoTranslate !== false;
      cb.onchange = function () { DATA.autoTranslate = cb.checked; saveQuiet(); };
      tg.appendChild(cb);
      tg.appendChild(document.createTextNode("同步时自动把英文文案翻译成日语和简体中文（句级缓存，不重复消耗额度）"));
      root.appendChild(tg);
      root.appendChild(addBtn("立即重新生成翻译", function () {
        translateAll().then(function (failCount) {
          toast(failCount > 0 ? (failCount + " 条翻译失败，已用英文兜底") : "翻译已重新生成 ✓");
        });
      }));
    }
  };

  function renderDrawer(id) {
    drawerBody.textContent = "";
    var meta = SECTIONS_META[id];
    drawerTitle.textContent = meta ? "编辑 · " + meta.name : "编辑";
    var fn = DRAWERS[id];
    if (fn) {
      try { fn(drawerBody); } catch (e) {
        var eb = document.createElement("div");
        eb.style.cssText = "background:#3a1515;color:#ff9c9c;border:1px solid #a33;border-radius:6px;padding:10px;margin:10px 0;font-size:12px";
        eb.textContent = "编辑区加载失败：" + e.message;
        drawerBody.appendChild(eb);
      }
    }
    drawerBody.scrollTop = 0;
  }
  function selectSection(id) {
    if (id === "nav" || id === "") id = "hero";
    if (!SECTIONS_META[id]) id = "hero";
    if (id === "settings" || !DATA.sections || DATA.sections.indexOf(id) < 0) {
      if (id !== "settings") { toast("该板块不在当前页面中"); return; }
    }
    currentSec = id;
    renderSecList();
    renderDrawer(id);
    drawer.classList.add("open");
    if (id !== "settings") pvGoto(id);
  }
  bind("btnSettings", function (el) { el.onclick = function () { selectSection("settings"); }; });

  // ---------- 设备切换 ----------
  var pvCenter = document.getElementById("pvCenter");
  bind("devDesktop", function (el) { el.onclick = function () {
    pvCenter.setAttribute("data-mode", "desktop");
    this.classList.add("active");
    var m = document.getElementById("devMobile"); if (m) m.classList.remove("active");
  }; });
  bind("devMobile", function (el) { el.onclick = function () {
    pvCenter.setAttribute("data-mode", "mobile");
    this.classList.add("active");
    var dd = document.getElementById("devDesktop"); if (dd) dd.classList.remove("active");
  }; });

  // ---------- 自动翻译（MyMemory 免费 API；句级缓存；同步时生成日语/简体中文） ----------
  var TR_SKIP = { src:1, href:1, url:1, logoSrc:1, playUrl:1, downloadHref:1, privacyHref:1, termsHref:1,
    sections:1, no:1, cap:1, date:1, brand:1, siteTitle:1, privacyContent:1, termsContent:1,
    privacyTitle:1, termsTitle:1, uiFontScale:1, autoTranslate:1, translations:1, g:1,
    /* 图片/资源路径与链接键，绝不能翻译（v57 修复） */
    before:1, after:1, linkUrl:1, img:1, images:1, shots:1, slides:1, poster:1, thumb:1, icon:1, iconSrc:1 };
  var TR_TEXT = /^[A-Za-z]/;
  function trFixBrand(t) { return String(t).replace(/トーンビー/g, "TONEBY").replace(/通比/g, "TONEBY"); }
  var trCache = {};
  try { trCache = JSON.parse(localStorage.getItem("tr_cache_v1")) || {}; } catch (e) { trCache = {}; }
  function trSaveCache() { try { localStorage.setItem("tr_cache_v1", JSON.stringify(trCache)); } catch (e) {} }
  function collectTexts(obj, path, out) {
    if (!obj || typeof obj !== "object") return;
    Object.keys(obj).forEach(function (k) {
      if (TR_SKIP[k]) return;
      var v = obj[k], p = path.concat(k);
      if (Array.isArray(v)) { v.forEach(function (item, i) { collectTexts(item, p.concat(i), out); }); return; }
      if (v && typeof v === "object") { collectTexts(v, p, out); return; }
      if (typeof v === "string" && TR_TEXT.test(v.trim()) && !/^toneby[™\s.!]*$/i.test(v.trim())) out.push({ path: p, text: v });
    });
  }
  function getPath(obj, path) { var cur = obj; for (var i = 0; i < path.length; i++) cur = cur[path[i]]; return cur; }
  function setPath(obj, path, v) { var cur = obj; for (var i = 0; i < path.length - 1; i++) { var k = path[i], nk = path[i + 1]; if (cur[k] === undefined || cur[k] === null) cur[k] = typeof nk === "number" ? [] : {}; cur = cur[k]; } cur[path[path.length - 1]] = v; }
  function myTranslate(text, lang) {
    /* 首选 Google gtx（快、支持 CORS），失败回落 MyMemory */
    var gtx = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=" + lang + "&dt=t&q=" + encodeURIComponent(text);
    var mm = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=en|" + lang + "&de=liudeqincanzai@gmail.com";
    function req(url) {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 10000);
      return fetch(url, { signal: ctrl.signal })
        .then(function (r) { return r.json(); })
        .then(function (j) { clearTimeout(timer); return j; })
        .catch(function () { clearTimeout(timer); return null; });
    }
    return req(gtx).then(function (j) {
      if (j && j[0] && j[0].length) {
        var out = "";
        j[0].forEach(function (seg) { if (seg && seg[0]) out += seg[0]; });
        if (out.trim()) return out.trim();
      }
      return req(mm).then(function (j2) {
        var t = j2 && j2.responseData && j2.responseData.translatedText;
        return (t && t.trim()) ? t : null;
      });
    });
  }
    function translateAll() {
    var jobs = [];
    collectTexts(DATA, [], jobs);
    if (!DATA.translations) DATA.translations = {};
    var langs = ["ja", "zh-CN"];
    var done = 0, fail = 0, total = jobs.length * langs.length;
    setStatus("翻译中 0/" + total + " …");
    var idx = 0;
    function worker() {
      if (idx >= jobs.length) return Promise.resolve();
      var job = jobs[idx++];
      return Promise.all(langs.map(function (lang) {
        if (!DATA.translations[lang]) DATA.translations[lang] = {};
        var ck = lang + "|" + job.text;
        var p = trCache[ck] ? Promise.resolve(trCache[ck]) : myTranslate(job.text, lang).then(function (t) {
          if (t) { trCache[ck] = t; trSaveCache(); }
          return t;
        });
        return p.then(function (t) {
          done++;
          if (t) setPath(DATA.translations[lang], job.path, trFixBrand(t)); else fail++;
          if (done % 5 === 0 || done >= total) setStatus("翻译中 " + done + "/" + total + " …");
        });
      })).then(worker);
    }
    return Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]).then(function () {
      setStatus("翻译完成 ");
      return saveQuiet() === undefined ? fail : fail;
    });
  }

  // ---------- 同步 ----------
  function buildDataJs() {
    return "// 由统一后台同步生成\nconst SITE_WEB = " + JSON.stringify(DATA, null, 2) + ";\n";
  }
  function toB64(bytes) {
    var bin = "", CHUNK = 0x8000;
    for (var i = 0; i < bytes.length; i += CHUNK)
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    return btoa(bin);
  }
  function ghApi(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({
      "Authorization": "Bearer " + getToken(),
      "Accept": "application/vnd.github+json"
    }, opts.headers || {});
    return fetch("https://api.github.com" + path, opts).then(function (res) {
      if (res.status === 401) throw new Error("Token 无效，请重新粘贴");
      if (res.status === 403) throw new Error("令牌没有主仓库(liudeqincanzai-ux.github.io)权限：请编辑「Toneby LUT 编辑器 永久」，在存储库访问中加入 liudeqincanzai-ux.github.io");
      return res;
    });
  }
  function ghPutFile(path, b64, message) {
    return ghApi("/repos/" + REPO + "/contents/" + encodeURI(path))
      .then(function (r) { return r.json(); })
      .then(function (info) { return info.sha; })
      .catch(function (e) {
        if (e.message.indexOf("令牌") >= 0 || e.message.indexOf("Token") >= 0) throw e;
        return null;
      })
      .then(function (sha) {
        return ghApi("/repos/" + REPO + "/contents/" + encodeURI(path), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: message, content: b64, sha: sha || undefined })
        });
      });
  }
  var statusEl = document.getElementById("syncStatus");
  var btnSync = document.getElementById("btnSync");
  function setStatus(msg, isErr) {
    statusEl.textContent = msg;
    statusEl.className = "sync-status" + (isErr ? " err" : "");
  }
  btnSync.onclick = function () {
    if (!getToken()) {
      showTokenModal(function () { btnSync.click(); });
      return;
    }
    saveQuiet();
    btnSync.disabled = true;
    var runSync = function () {
    var tries = 0;
    (function clickLut() {
      var b = null;
      try { b = lutFrame.contentDocument.querySelector(".edit-bar .bar-actions button.primary"); } catch (e) {}
      if (b) b.click();
      else if (tries++ < 20) setTimeout(clickLut, 500);
    })();
    var textEnc = new TextEncoder().encode(buildDataJs());
    var jobs = [["data.js", Promise.resolve(toB64(textEnc))]];
    Object.keys(pending).forEach(function (p) {
      jobs.push([p, pending[p].arrayBuffer().then(function (buf) { return toB64(new Uint8Array(buf)); })]);
    });
    var done = 0, failed = 0;
    setStatus("同步中 0/" + jobs.length + " …");
    jobs.reduce(function (chain, job) {
      return chain.then(function () {
        return job[1].then(function (b64) {
          return ghPutFile(job[0], b64, "官网更新: " + job[0]);
        }).then(function () {
          done++;
          setStatus("同步中 " + done + "/" + jobs.length + " …");
          delete pending[job[0]];
        }).catch(function (e) {
          failed++;
          setStatus("「" + job[0] + "」失败：" + e.message, true);
        });
      });
    }, Promise.resolve()).then(function () {
      btnSync.disabled = false;
      if (failed === 0) {
        setStatus("✓ 已同步到 GitHub，网站约 1 分钟内更新");
        toast("同步成功 ✓");
      } else {
        setStatus("部分失败（" + failed + " 个），可重试", true);
      }
    });
    };
    if (DATA.autoTranslate !== false) {
      translateAll().then(function (failCount) {
        if (failCount > 0) toast(failCount + " 条文案翻译失败，已用英文兜底");
        runSync();
      });
    } else { runSync(); }
  };

  // ---------- 启动 ----------
  function start() {
    /* 先显示面板（内联引导兜底，任何异常都不会导致打开后台时整页空白） */
    if (window.__admShow) window.__admShow();
    webPane.style.display = "flex";
    lutPane.style.display = "none";
    btnWeb.classList.add("active");
    btnLut.classList.remove("active");
    try { renderSecList(); } catch (e) {
      try { pvRefreshSoon(); } catch (e2) {}
      if (window.onerror) window.onerror("板块列表渲染失败: " + e.message, "admin.v47.js", 0);
    }
  }
  // ---------- 自动解锁（已登录则直接进后台；必须在所有 DOM 变量初始化之后执行） ----------
  try {
    if (sessionStorage.getItem("lut_admin_unlocked") === "1") {
      if (window.__admShow) window.__admShow();
      gateEl.style.display = "none";
      appEl.style.display = "flex";
      appEl.style.flexDirection = "column";
      start();
    } else { passInput.focus(); }
  } catch (e) { try { passInput.focus(); } catch (e2) {} }
})();
