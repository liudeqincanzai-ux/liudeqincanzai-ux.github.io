// 统一后台：官网编辑（数据驱动 toneby-website）+ LUT 展示编辑（iframe 内嵌）
(function () {
  var SAVE_KEY = "lut_web_edits_v1";
  var PASS_KEY = "lut_site_admin_pass";
  var TOKEN_KEY = "lut_gh_token";
  var REPO = "liudeqincanzai-ux/liudeqincanzai-ux.github.io";

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
  try {
    var s = JSON.parse(localStorage.getItem(SAVE_KEY));
    DATA = mergeDeep(JSON.parse(JSON.stringify(SITE_WEB)), (s && s.site) ? s.site : null);
  } catch (e) { DATA = JSON.parse(JSON.stringify(SITE_WEB)); }
  var pending = {}; // path -> File

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
      start();
    } else {
      gateErr.textContent = "密码不对，再试一次";
      passInput.value = "";
    }
  }
  document.getElementById("gateBtn").onclick = enter;
  passInput.addEventListener("keydown", function (e) { if (e.key === "Enter") enter(); });
  try {
    if (sessionStorage.getItem("lut_admin_unlocked") === "1") {
      gateEl.style.display = "none";
      appEl.style.display = "flex";
      start();
    } else { passInput.focus(); }
  } catch (e) { passInput.focus(); }

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
      + "2. 在「存储库访问」里点更新，把 <b>liudeqincanzai-ux.github.io</b> 也加入选择<br>"
      + "3. 保存后回到这里，点「保存并同步官网」即可（令牌串不变）";
    box.appendChild(steps);
    var linkBtn = document.createElement("button");
    linkBtn.type = "button";
    linkBtn.style.cssText = "width:100%;margin-bottom:12px;";
    linkBtn.textContent = "① 打开我的令牌列表";
    linkBtn.onclick = function () {
      window.open("https://github.com/settings/personal-access-tokens", "_blank");
    };
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

  // 图片选择器（返回相对路径），预览用 objectURL
  var objUrls = {};
  function imagePicker(currentSrc, onPick) {
    var wrap = document.createElement("div");
    wrap.className = "img-pick";
    var img = document.createElement("img");
    img.className = "thumb";
    img.src = objUrls[currentSrc] || currentSrc;
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
    webPane.style.display = "block"; lutPane.style.display = "none";
  };
  btnLut.onclick = function () {
    btnLut.classList.add("active"); btnWeb.classList.remove("active");
    lutPane.style.display = "block"; webPane.style.display = "none";
  };

  // 隐藏 iframe 内 LUT 编辑器自带的按钮组（统一由父页「保存并同步官网」保存全部）
  var lutFrame = document.getElementById("lutFrame");
  lutFrame.addEventListener("load", function(){ try { injectHide(lutFrame); } catch(e){} });
  setInterval(function(){ try { injectHide(lutFrame); } catch(e){} }, 2000);
  function injectHide(f){
    var d = f.contentDocument;
    if (!d || !d.getElementById) return;
    if (d.getElementById("adminHideStyle")) return;
    var st = d.createElement("style");
    st.id = "adminHideStyle";
    st.textContent = ".edit-bar .bar-actions { display:none !important; }";
    (d.head || d.body).appendChild(st);
  }

  // ---------- 官网编辑表单 ----------
  function h2(t) { var e = document.createElement("h2"); e.textContent = t; return e; }

  function renderWeb() {
    var root = document.getElementById("webEditor");
    root.textContent = "";
    root.appendChild(h2("品牌与导航"));
    root.appendChild(field("网站标识（左上角）", "", DATA.nav.brand, function (v) { DATA.nav.brand = v; }));
    root.appendChild(field("下载按钮文字", "", DATA.nav.downloadLabel, function (v) { DATA.nav.downloadLabel = v; }));

    
    root.appendChild(imagePicker(DATA.nav.logoSrc || "", function (p) { DATA.nav.logoSrc = p; saveQuiet(); toast("图标已更换 ✓"); }));
    var logoClear = document.createElement("button");
    logoClear.type = "button"; logoClear.className = "add-btn";
    logoClear.textContent = "恢复默认黑色 T 图标";
    logoClear.onclick = function () { DATA.nav.logoSrc = ""; saveQuiet(); renderWeb(); toast("已恢复默认图标"); };
    root.appendChild(logoClear);
    root.appendChild(h2("HERO 主视觉"));
    root.appendChild(field("小标（等宽字）", "", DATA.hero.meta, function (v) { DATA.hero.meta = v; }));
    root.appendChild(field("大标题", "支持 <br> 换行", DATA.hero.title, function (v) { DATA.hero.title = v; }, 2));
    root.appendChild(field("介绍段落", "", DATA.hero.intro, function (v) { DATA.hero.intro = v; }, 4));
    var r2 = document.createElement("div"); r2.className = "row2";
    r2.appendChild(field("下载按钮小字", "", DATA.hero.playLabel, function (v) { DATA.hero.playLabel = v; }));
    r2.appendChild(field("下载按钮商店名", "", DATA.hero.playStore, function (v) { DATA.hero.playStore = v; }));
    root.appendChild(r2);
    root.appendChild(field("Google Play 链接", "上架后填正式链接", DATA.hero.playUrl, function (v) { DATA.hero.playUrl = v; }));

    root.appendChild(h2("轮播截图（第一张显示在最前，后层自动灰化）"));
    (DATA.hero.slides || []).forEach(function (s, i) {
      var card = document.createElement("div");
      card.className = "item-card";
      var head = document.createElement("div");
      head.className = "item-head";
      head.appendChild(Object.assign(document.createElement("span"), { className: "t", textContent: "截图 " + (i + 1) }));
      var ops = document.createElement("span");
      ops.className = "ops";
      [["↑", function () { if (i > 0) { var t = DATA.hero.slides[i - 1]; DATA.hero.slides[i - 1] = DATA.hero.slides[i]; DATA.hero.slides[i] = t; saveQuiet(); renderWeb(); } }],
       ["↓", function () { if (i < DATA.hero.slides.length - 1) { var t = DATA.hero.slides[i + 1]; DATA.hero.slides[i + 1] = DATA.hero.slides[i]; DATA.hero.slides[i] = t; saveQuiet(); renderWeb(); } }],
       ["删除", function () { DATA.hero.slides.splice(i, 1); saveQuiet(); renderWeb(); }, 1]
      ].forEach(function (d) {
        var b = document.createElement("button");
        b.textContent = d[0];
        if (d[2]) b.className = "danger";
        b.onclick = d[1];
        ops.appendChild(b);
      });
      head.appendChild(ops);
      card.appendChild(head);
      var pick = imagePicker(s.src, function (p) { s.src = p; saveQuiet(); });
      card.appendChild(pick);
      card.appendChild(field("下方标注文字", "", s.cap, function (v) { s.cap = v; }));
      card.appendChild(field("所属分组 (0/1/2)", "0=胶片彩色引擎 1=本地隐私 2=LUT相机及更多", String(s.g), function (v) { s.g = parseInt(v) || 0; }));
      root.appendChild(card);
    });
    var addShot = document.createElement("button");
    addShot.className = "add-img-btn";
    addShot.textContent = "＋ 添加轮播截图（可多选，自动压缩）";
    var shotInput = document.createElement("input");
    shotInput.type = "file"; shotInput.accept = "image/*"; shotInput.multiple = true; shotInput.style.display = "none";
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
          saveQuiet(); renderWeb();
          left--;
          if (left === 0) toast("截图已添加 ✓ 同步时上传");
        });
      });
      shotInput.value = "";
    };
    addShot.onclick = function () { shotInput.click(); };
    root.appendChild(addShot);
    root.appendChild(document.createElement("div"));

    root.appendChild(h2("右侧分组标签（3 组）"));
    (DATA.hero.groups || []).forEach(function (g, i) {
      var r = document.createElement("div"); r.className = "row2";
      r.appendChild(field("编号 " + (i + 1), "如 — 01", g.no, function (v) { g.no = v; }));
      r.appendChild(field("标签文字 " + (i + 1), "", g.label, function (v) { g.label = v; }));
      root.appendChild(r);
    });

    root.appendChild(h2("巨号数字三栏"));
    (DATA.numbers || []).forEach(function (n, i) {
      var card = document.createElement("div");
      card.className = "item-card";
      card.appendChild(field("编号 " + (i + 1), "如 01", n.no, function (v) { n.no = v; }));
      card.appendChild(field("标题 " + (i + 1), "", n.title, function (v) { n.title = v; }));
      card.appendChild(field("描述 " + (i + 1), "", n.desc, function (v) { n.desc = v; }, 2));
      root.appendChild(card);
    });

    root.appendChild(h2("功能标题区"));
    root.appendChild(field("小标", "", DATA.intro2.tag, function (v) { DATA.intro2.tag = v; }));
    root.appendChild(field("标题", "", DATA.intro2.title, function (v) { DATA.intro2.title = v; }));
    root.appendChild(field("描述", "", DATA.intro2.desc, function (v) { DATA.intro2.desc = v; }, 3));

    root.appendChild(h2("MODULE 功能模块（5 个）"));
    (DATA.modules || []).forEach(function (m, i) {
      var card = document.createElement("div");
      card.className = "item-card";
      card.appendChild(field("MODULE 编号", "如 MODULE01", m.mod, function (v) { m.mod = v; }));
      card.appendChild(field("标题", "", m.title, function (v) { m.title = v; }));
      card.appendChild(field("描述", "", m.desc, function (v) { m.desc = v; }, 3));
      card.appendChild(imagePicker(m.src, function (p) { m.src = p; saveQuiet(); }));
      root.appendChild(card);
    });

    root.appendChild(h2("LUT Gallery 预览"));
    root.appendChild(field("标题", "", DATA.gallery.title, function (v) { DATA.gallery.title = v; }));
    root.appendChild(field("描述", "", DATA.gallery.desc, function (v) { DATA.gallery.desc = v; }, 2));
    (DATA.gallery.cards || []).forEach(function (c, i) {
      var r = document.createElement("div"); r.className = "row2";
      r.appendChild(field("卡片 " + (i + 1) + " 名称", "", c.name, function (v) { c.name = v; }));
      r.appendChild(field("卡片 " + (i + 1) + " 小字", "", c.sub, function (v) { c.sub = v; }));
      root.appendChild(r);
    });
    root.appendChild(field("按钮文字", "", DATA.gallery.linkLabel, function (v) { DATA.gallery.linkLabel = v; }));
    root.appendChild(field("按钮链接", "", DATA.gallery.linkUrl, function (v) { DATA.gallery.linkUrl = v; }));

    root.appendChild(h2("FAQ 常见问题"));
    (DATA.faq || []).forEach(function (f, i) {
      var card = document.createElement("div");
      card.className = "item-card";
      var head = document.createElement("div");
      head.className = "item-head";
      head.appendChild(Object.assign(document.createElement("span"), { className: "t", textContent: "问题 " + (i + 1) }));
      var ops = document.createElement("span");
      ops.className = "ops";
      var del = document.createElement("button");
      del.className = "danger";
      del.textContent = "删除";
      del.onclick = function () { DATA.faq.splice(i, 1); saveQuiet(); renderWeb(); };
      ops.appendChild(del);
      head.appendChild(ops);
      card.appendChild(head);
      card.appendChild(field("问题", "", f.q, function (v) { f.q = v; }));
      card.appendChild(field("回答", "", f.a, function (v) { f.a = v; }, 3));
      root.appendChild(card);
    });
    var addFaq = document.createElement("button");
    addFaq.className = "add-btn";
    addFaq.textContent = "＋ 添加一条 FAQ";
    addFaq.onclick = function () { DATA.faq.push({ q: "新问题？", a: "回答内容" }); saveQuiet(); renderWeb(); };
    root.appendChild(addFaq);

    root.appendChild(h2("CTA 与页脚"));
    root.appendChild(field("CTA 标语", "", DATA.cta.title, function (v) { DATA.cta.title = v; }));
    root.appendChild(field("页脚品牌名", "", DATA.footer.brand, function (v) { DATA.footer.brand = v; }));
    var r3 = document.createElement("div"); r3.className = "row2";
    r3.appendChild(field("隐私政策链接文字", "", DATA.footer.privacyLabel, function (v) { DATA.footer.privacyLabel = v; }));
    r3.appendChild(field("用户协议链接文字", "", DATA.footer.termsLabel, function (v) { DATA.footer.termsLabel = v; }));
    root.appendChild(r3);
    root.appendChild(field("版权行", "", DATA.footer.copy, function (v) { DATA.footer.copy = v; }));
    root.appendChild(field("隐私政策页面文件", "一般不改", DATA.footer.privacyHref, function (v) { DATA.footer.privacyHref = v; }));
    root.appendChild(field("用户协议页面文件", "一般不改", DATA.footer.termsHref, function (v) { DATA.footer.termsHref = v; }));

    root.appendChild(h2("站点与标题"));
    root.appendChild(field("网站名称（浏览器标签标题）", "也会显示为网站名", DATA.siteTitle || "Toneby", function (v) { DATA.siteTitle = v; }));
    root.appendChild(field("LUT 画廊区块标题", "", DATA.galleryTitle || "LUT Gallery", function (v) { DATA.galleryTitle = v; }));
    root.appendChild(field("FAQ 区块标题", "", DATA.faqTitle || "Frequently Asked Questions", function (v) { DATA.faqTitle = v; }));
    root.appendChild(h2("隐私政策页面内容"));
    root.appendChild(field("页面标题", "", DATA.legal.privacyTitle, function (v) { DATA.legal.privacyTitle = v; }));
    root.appendChild(field("页面内容（HTML）", "支持 <h3>/<p>/<strong> 等标签", DATA.legal.privacyContent, function (v) { DATA.legal.privacyContent = v; }, 12));
    root.appendChild(h2("用户协议页面内容"));
    root.appendChild(field("页面标题", "", DATA.legal.termsTitle, function (v) { DATA.legal.termsTitle = v; }));
    root.appendChild(field("页面内容（HTML）", "支持 <h2>/<p>/<em> 等标签", DATA.legal.termsContent, function (v) { DATA.legal.termsContent = v; }, 12));
    root.appendChild(h2("GitHub Token"));
    root.appendChild(field("令牌", "官网同步与 LUT 同步共用；需同时有权访问两个仓库", "", function (v) {
      if (v && v.trim()) { setToken(v); toast("Token 已保存 ✓"); }
    }));
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

  document.getElementById("btnSync").onclick = function () {
    try {
      var lb = null, tries = 0;
      (function clickLut(){
        var f = document.getElementById("lutFrame");
        try { lb = f.contentDocument.querySelector(".edit-bar .bar-actions button.primary"); } catch(e){}
        if (lb) lb.click();
        else if (tries++ < 20) setTimeout(clickLut, 500);
      })();
    } catch(e){}
    if (!getToken()) {
      setStatus("", false);
      showTokenModal(function () { document.getElementById("btnSync").click(); });
      return;
    }
    saveQuiet();
    btnSync.disabled = true;
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

  // ---------- 启动 ----------
  function start() {
    renderWeb();
    webPane.style.display = "block";
    lutPane.style.display = "none";
    btnWeb.classList.add("active");
    btnLut.classList.remove("active");
  }
})();
