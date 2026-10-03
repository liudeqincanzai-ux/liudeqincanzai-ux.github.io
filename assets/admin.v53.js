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
    if (Array.isArray(base)) {
      if (!over || !Array.isArray(over)) return JSON.parse(JSON.stringify(base));
      /* v61b：数组以保存的覆盖数据为准（短则截断=删除生效，长则追加）——旧写法 base 做种子按下标合并，删除的板块/条目重载后从 base 复活 */
      var arr = [];
      over.forEach(function (item, i) { arr[i] = (i < base.length) ? mergeDeep(base[i], item) : item; });
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
  /* ---- v61 三语字段：英文主输入框下方直接跟 日本語/中文 两个输入框 ---- */
  var trPaths = [];
  function trGet(lang, ks) {
    if (!DATA.translations || !DATA.translations[lang]) return "";
    var c = DATA.translations[lang];
    for (var i = 0; i < ks.length; i++) { c = c ? c[ks[i]] : undefined; }
    return typeof c === "string" ? c : "";
  }
  function trSet(lang, ks, v) {
    if (!DATA.translations) DATA.translations = { ja: {}, "zh-CN": {} };
    if (!DATA.translations[lang]) DATA.translations[lang] = {};
    var c = DATA.translations[lang];
    for (var i = 0; i < ks.length - 1; i++) {
      var k = ks[i], nk = ks[i + 1];
      if (c[k] === undefined || c[k] === null || typeof c[k] !== "object") c[k] = typeof nk === "number" ? [] : {};
      c = c[k];
    }
    var last = ks[ks.length - 1];
    if (v && v.trim()) c[last] = v; else delete c[last];
    saveQuiet();
  }
  function trOneText(text, lang) {
    var p = Promise.resolve(null);
    if (lang === "zh-CN") {
      p = fetch("https://transmart.qq.com/api/imt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ header: { fn: "auto_translation", session: "", client_key: "browser-web" }, source: { text_list: [text], options: "auto2zh_CN" } }) }).then(function (r) { return r.json(); }).then(function (j) {
        return (j && j.header && j.header.ret_code === "succ" && j.auto_translation && j.auto_translation[0]) ? j.auto_translation[0] : null;
      }).catch(function () { return null; });
    } else {
      p = fetch("https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" + lang + "&dt=t&q=" + encodeURIComponent(text)).then(function (r) { return r.json(); }).then(function (j) {
        var out = "";
        if (j && j[0]) j[0].forEach(function (seg) { if (seg && seg[0]) out += seg[0]; });
        if (out.trim()) return out.trim();
        return fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=Autodetect|" + lang + "&de=liudeqincanzai%40gmail.com").then(function (r2) { return r2.json(); }).then(function (j2) {
          var t = j2 && j2.responseData && j2.responseData.translatedText;
          if (!t || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) return null;
          return String(t).replace(/トーンビー/g, "TONEBY").replace(/通比/g, "TONEBY");
        });
      }).catch(function () { return null; });
    }
    return Promise.race([p, new Promise(function (res) { setTimeout(function () { res(null); }, 16000); })]);
  }
  function fieldTr(label, hint, path, rows) {
    var ks = Array.isArray(path) ? path : path.split(".");
    trPaths.push(ks);
    function getEn() { var c = DATA; for (var i = 0; i < ks.length; i++) c = c ? c[ks[i]] : undefined; return typeof c === "string" ? c : ""; }
    var wrap = document.createElement("div");
    wrap.appendChild(field(label, hint, getEn(), function (v) {
      var c = DATA;
      for (var i = 0; i < ks.length - 1; i++) c = c[ks[i]];
      c[ks[ks.length - 1]] = v;
    }, rows));
    if (!DATA.translations) DATA.translations = { ja: {}, "zh-CN": {} };
    [["ja", "日本語"], ["zh-CN", "中文"]].forEach(function (pair) {
      var row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:flex-start;gap:6px;margin-top:4px";
      var lb = document.createElement("span");
      lb.style.cssText = "color:#888;font-size:11px;white-space:nowrap;width:46px;padding-top:" + (rows ? "6px" : "5px");
      lb.textContent = pair[1];
      var inp;
      if (rows) { inp = document.createElement("textarea"); inp.rows = Math.max(2, rows - 1); }
      else { inp = document.createElement("input"); inp.type = "text"; }
      inp.value = trGet(pair[0], ks);
      inp.style.cssText = "flex:1;background:#161616;border:1px solid #444;color:#eee;border-radius:4px;padding:5px 8px;font-size:12px;font-family:inherit";
      inp.oninput = function () { trSet(pair[0], ks, inp.value); pvRefreshSoon(); };
      row.appendChild(lb);
      row.appendChild(inp);
      wrap.appendChild(row);
    });
    return wrap;
  }
  function fillTrBlanks() {
    var todo = [];
    trPaths.forEach(function (ks) {
      ["ja", "zh-CN"].forEach(function (lang) {
        if (!trGet(lang, ks)) todo.push({ lang: lang, ks: ks, text: (function () { var c = DATA; for (var i = 0; i < ks.length; i++) c = c ? c[ks[i]] : undefined; return typeof c === "string" ? c : ""; })() });
      });
    });
    if (!todo.length) { toast("本板块没有留空的翻译"); return; }
    var done = 0;
    toast("翻译中 0/" + todo.length + " …");
    var idx = 0;
    function worker() {
      if (idx >= todo.length) { toast("填空完成 ✓ 记得点保存并同步官网"); return; }
      var it = todo[idx++];
      trOneText(it.text, it.lang).then(function (t) {
        done++;
        toast("翻译中 " + done + "/" + todo.length + " …");
        if (t) trSet(it.lang, it.ks, t);
        worker();
      });
    }
    worker();
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

  // ---------- v59 文章正文编辑器（抽屉内嵌所见即所得 + 三语 + 图片上传） ----------
  var blobRev = {};   /* blobURL -> 最终路径，保存/切语言时把预览图换回路径 */
  var ART_LANGS = [["content", "EN"], ["content_ja", "日本語"], ["content_zh", "中文"]];
  var artStyleDone = false;
  function ensureArtStyle() {
    if (artStyleDone) return;
    artStyleDone = true;
    var st = document.createElement("style");
    st.textContent =
      ".art-inline{margin:8px 0 4px;border:1px solid #333;border-radius:6px;background:#141414;overflow:hidden}" +
      ".art-inline-tabs{display:flex;gap:6px;padding:8px 10px 0;background:#1b1b1b}" +
      ".art-inline-tabs button{background:#2a2a2a;color:#bbb;border:none;padding:5px 12px;cursor:pointer;font-size:12px;border-radius:4px 4px 0 0}" +
      ".art-inline-tabs button.on{background:#141414;color:#fff;font-weight:700}" +
      ".art-inline-tools{display:flex;gap:4px;padding:8px 10px;background:#1b1b1b;border-bottom:1px solid #2a2a2a;flex-wrap:wrap}" +
      ".art-inline-tools button{background:#242424;border:1px solid #3a3a3a;color:#ddd;padding:5px 9px;cursor:pointer;font-size:12px;border-radius:3px}" +
      ".art-inline-tools button:hover{background:#303030}" +
      ".art-inline-tools button.danger{color:#e06c5a;border-color:#7a3a30}" +
      ".art-inline-page{min-height:220px;max-height:420px;overflow:auto;padding:16px;background:#fff;color:#111;font-size:14.5px;line-height:1.8;outline:none;cursor:text}" +
      ".art-inline-page:empty:before{content:'在此输入正文…';color:#aaa}" +
      ".art-inline-page img{max-width:100%;height:auto;display:block;margin:18px auto;border-radius:4px}" +
      ".art-inline-page h2{font-size:20px;font-weight:800;margin:26px 0 10px;text-transform:uppercase}" +
      ".art-inline-page h3{font-size:16.5px;font-weight:800;margin:22px 0 8px;text-transform:uppercase}" +
      ".art-inline-page blockquote{border-left:3px solid #111;margin:16px 0;padding:2px 0 2px 14px;color:#555;font-style:italic}" +
      ".art-inline-page hr{border:none;border-top:1px solid #111;margin:24px 0}" +
      ".art-inline-foot{display:flex;gap:8px;padding:8px 10px;background:#1b1b1b;align-items:center}" +
      ".art-inline-foot button{border:none;padding:6px 14px;cursor:pointer;font-size:12.5px;border-radius:3px}" +
      ".art-inline-foot .ok{background:#4a9edd;color:#fff;font-weight:700}" +
      ".art-inline-foot .clr{background:none;color:#e06c5a;border:1px solid #7a3a30}" +
      ".art-inline-foot .hint{margin-left:auto;font-size:11px;color:#777}";
    document.head.appendChild(st);
  }
  function artHtmlFor(j, key) {
    return String(j[key] || "").replace(/src="(assets\/shots\/[^"]+)"/g, function (m, p) {
      return objUrls[p] ? 'src="' + objUrls[p] + '"' : m;
    });
  }
  function makeArtEditor(j, refresh) {
    ensureArtStyle();
    var cur = "content";
    var saveTimer = null;
    var box = document.createElement("div");
    box.className = "art-inline";
    function saveNow() {
      var clone = page.cloneNode(true);
      Array.prototype.forEach.call(clone.querySelectorAll("img"), function (im) {
        var p = blobRev[im.getAttribute("src")];
        if (p) im.setAttribute("src", p);
      });
      var html = clone.innerHTML.trim();
      if (html === "<br>" || html === "<div><br></div>") html = "";
      j[cur] = html;
    }
    function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(function () { saveNow(); saveQuiet(); }, 600); }
    var tabs = document.createElement("div"); tabs.className = "art-inline-tabs";
    ART_LANGS.forEach(function (L, li) {
      var tb = document.createElement("button");
      tb.type = "button"; tb.textContent = L[1];
      if (li === 0) tb.classList.add("on");
      tb.onclick = function () {
        if (cur === L[0]) return;
        saveNow();
        cur = L[0];
        page.innerHTML = artHtmlFor(j, cur);
        Array.prototype.forEach.call(tabs.children, function (x) { x.classList.remove("on"); });
        tb.classList.add("on");
      };
      tabs.appendChild(tb);
    });
    box.appendChild(tabs);
    var tools = document.createElement("div");
    tools.className = "art-inline-tools";
    function tBtn(label, fn, cls) {
      var b = document.createElement("button");
      b.type = "button"; b.innerHTML = label;
      if (cls) b.className = cls;
      b.onmousedown = function (e) { e.preventDefault(); };
      b.onclick = fn;
      tools.appendChild(b);
      return b;
    }
    function cmd(c, v) { page.focus(); document.execCommand(c, false, v || null); saveSoon(); }
    tBtn("H2 标题", function () { cmd("formatBlock", "<h2>"); });
    tBtn("H3 小标题", function () { cmd("formatBlock", "<h3>"); });
    tBtn("正文段", function () { cmd("formatBlock", "<p>"); });
    tBtn("<b>B</b> 加粗", function () { cmd("bold"); });
    tBtn("<i>I</i> 斜体", function () { cmd("italic"); });
    tBtn("• 列表", function () { cmd("insertUnorderedList"); });
    tBtn("1. 列表", function () { cmd("insertOrderedList"); });
    tBtn("❝ 引用", function () { cmd("formatBlock", "<blockquote>"); });
    tBtn("― 分隔线", function () { cmd("insertHorizontalRule"); });
    tBtn("居中", function () { cmd("justifyCenter"); });
    tBtn("居左", function () { cmd("justifyLeft"); });
    tBtn("🔗 链接", function () {
      var u = prompt("链接地址（https:// 开头）");
      if (u && u.trim()) cmd("createLink", u.trim());
    });
    tBtn("🖼 图片", function () {
      var fi = document.createElement("input");
      fi.type = "file"; fi.accept = "image/*";
      fi.onchange = function () {
        var f = fi.files && fi.files[0];
        if (!f) return;
        shrinkImage(f, function (out) {
          var path = "assets/shots/art-" + Date.now() + "-" + Math.floor(Math.random() * 1000) + ".jpg";
          var bu = URL.createObjectURL(out);
          objUrls[path] = bu; blobRev[bu] = path;
          pending[path] = out;
          page.focus();
          document.execCommand("insertHTML", false, '<img src="' + bu + '">');
          saveSoon();
          toast("图片已插入 ✓ 同步时上传");
        });
        fi.value = "";
      };
      fi.click();
    });
    tBtn("清除格式", function () { cmd("removeFormat"); });
    box.appendChild(tools);
    var page = document.createElement("div");
    page.className = "art-inline-page";
    page.contentEditable = "true";
    page.innerHTML = artHtmlFor(j, cur);
    page.addEventListener("input", saveSoon);
    box.appendChild(page);
    var foot = document.createElement("div");
    foot.className = "art-inline-foot";
    var done = document.createElement("button");
    done.type = "button"; done.className = "ok"; done.textContent = "完成并收起 ✓";
    done.onclick = function () { saveNow(); saveQuiet(); box.__close(); };
    foot.appendChild(done);
    var clr = document.createElement("button");
    clr.type = "button"; clr.className = "clr"; clr.textContent = "✕ 清空本语言正文";
    clr.onclick = function () {
      if (confirm("清空当前语言的正文？")) { j[cur] = ""; page.innerHTML = ""; saveQuiet(); refresh(); }
    };
    foot.appendChild(clr);
    var hint = document.createElement("span");
    hint.className = "hint";
    hint.textContent = "自动保存中 · 图片随「同步」上传";
    foot.appendChild(hint);
    box.appendChild(foot);
    box.__close = function () {
      clearTimeout(saveTimer);
      if (box.parentNode) box.parentNode.removeChild(box);
      refresh();
    };
    return box;
  }
  function artEntryRow(j, refresh) {
    var wrap = document.createElement("div");
    function hasContent() { return ART_LANGS.some(function (L) { return (j[L[0]] || "").trim(); }); }
    var tag = document.createElement("div");
    tag.style.cssText = "font-size:11.5px;color:#999;margin:2px 0 6px;";
    tag.textContent = hasContent() ? "✓ 站内文章页正文：已写（前台点击打开文章页，无需填链接框）" : "正文：未写（写正文后前台点击自动打开站内文章页）";
    wrap.appendChild(tag);
    var b = document.createElement("button");
    b.type = "button"; b.className = "pickbtn";
    b.textContent = hasContent() ? "编辑正文（在下方直接排版）" : "写正文（在下方直接排版）";
    var ed = null;
    b.onclick = function () {
      if (ed && ed.parentNode) { ed.__close(); return; }
      ed = makeArtEditor(j, refresh);
      wrap.parentNode.insertBefore(ed, wrap.nextSibling);
      b.textContent = "收起正文编辑器";
      tag.textContent = "↓ 在下方编辑区直接排版（自动保存）";
    };
    wrap.appendChild(b);
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
      var dashI = id.indexOf("-");
      var baseId = dashI > 0 ? id.slice(0, dashI) : id;
      var meta = SECTIONS_META[baseId] || SECTIONS_META[id];
      if (!meta) return;
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sec-item" + (currentSec === id ? " active" : "");
      btn.innerHTML = '<span class="ico">' + meta.ico + '</span><span class="nm">' + meta.name + (baseId !== id ? " " + id.slice(dashI + 1) : "") + "</span>";
      var ord = document.createElement("span");
      ord.className = "ord";
      [["↑", function () { if (i > 0) { var t = DATA.sections[i - 1]; DATA.sections[i - 1] = DATA.sections[i]; DATA.sections[i] = t; afterOrder(); } }],
       ["↓", function () { if (i < DATA.sections.length - 1) { var t = DATA.sections[i + 1]; DATA.sections[i + 1] = DATA.sections[i]; DATA.sections[i] = t; afterOrder(); } }],
       ["✕", function () {
          var nm = (meta ? meta.name : baseId) + (baseId !== id ? " " + id.slice(dashI + 1) : "");
          if (!confirm("确定删除板块「" + nm + "」吗？\n\n删除后将从前台移除；该板块里填写的内容不会恢复（重新添加是空白板块）。")) return;
          DATA.sections.splice(i, 1);
          if (dashI > 0 && DATA[id]) delete DATA[id];
          if (currentSec === id) { currentSec = null; drawer.classList.remove("open"); }
          saveQuiet();
          renderSecList();
          pvRefreshSoon();
          toast("板块已删除 ✓ 同步后前台生效");
        }]
      ].forEach(function (d) {
        var ob = document.createElement("button");
        ob.type = "button"; ob.textContent = d[0]; ob.onclick = d[1];
        if (d[0] === "✕") { ob.style.color = "#e06c5a"; ob.title = "删除板块"; }
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
  /* v61 各类型实例初始数据（与基础键同构，深拷贝） */
  var BASE_PROTO = {
    hero: function () { return DATA.hero; },
    numbers: function () { return DATA.numbers; },
    features: function () { return DATA.intro2; },
    modules: function () { return DATA.modules; },
    compare: function () { return DATA.compare; },
    gallery: function () { return { galleryTitle: DATA.galleryTitle || "LUT Gallery", gallery: DATA.gallery || { desc: "" } }; },
    journal: function () { return { journalEyebrow: DATA.journalEyebrow || "", journalTitle: DATA.journalTitle || "", journalDesc: DATA.journalDesc || "", journal: DATA.journal || [] }; },
    faq: function () { return { faqEyebrow: DATA.faqEyebrow || "", faqTitle: DATA.faqTitle || "Frequently Asked Questions", faqDesc: DATA.faqDesc || "", faq: DATA.faq || [] }; },
    cta: function () { return DATA.cta; }
  };
  if (addSecBtn && addMenu) addSecBtn.onclick = function () {
    if (addMenu.style.display === "none") {
      addMenu.textContent = "";
      Object.keys(SECTIONS_META).forEach(function (id) {
        if (id === "settings") return;
        var b = document.createElement("button");
        b.type = "button";
        b.innerHTML = '<span class="ico">' + SECTIONS_META[id].ico + "</span>" + SECTIONS_META[id].name;
        b.onclick = function () {
          /* v61：无限添加——生成 type-N 实例（同构初始数据），互不影响 */
          var used = {};
          DATA.sections.forEach(function (s) { used[s] = true; });
          var n = 2;
          while (used[id + "-" + n]) n++;
          var newId = id + "-" + n;
          DATA[newId] = JSON.parse(JSON.stringify(BASE_PROTO[id]()));
          DATA.sections.push(newId);
          saveQuiet();
          renderSecList();
          pvRefreshSoon();
          toast("已添加「" + SECTIONS_META[id].name + " " + n + "」✓ 同步后前台生效");
          addMenu.style.display = "none";
          selectSection(newId);
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
    hero: function (root, sid) {
      root.appendChild(fsSlider(sid));
      var H = DATA[sid] || DATA.hero;
      root.appendChild(h2("品牌与导航"));
      root.appendChild(field("网站标识（左上角）", "", DATA.nav.brand, function (v) { DATA.nav.brand = v; }));
      root.appendChild(imagePicker(DATA.nav.logoSrc || "", function (p) { DATA.nav.logoSrc = p; saveQuiet(); pvRefreshSoon(); toast("图标已更换 ✓"); }));
      root.appendChild(addBtn("恢复默认黑色 T 图标", function () { DATA.nav.logoSrc = ""; saveQuiet(); renderDrawer(sid); pvRefreshSoon(); toast("已恢复默认图标"); }));
      root.appendChild(fieldTr("下载按钮文字", "", ["nav", "downloadLabel"]));
      root.appendChild(h2("HERO 主视觉"));
      root.appendChild(fieldTr("小标（等宽字）", "", [sid, "meta"]));
      root.appendChild(fieldTr("顶部眉行小字", "", [sid, "eyebrow"]));
      root.appendChild(field("大字标题", "建议 TONEBY", H.big || "", function (v) { H.big = v; }));
      root.appendChild(fieldTr("大字下方小字", "", [sid, "sub"]));
      root.appendChild(fieldTr("介绍段落", "", [sid, "intro"], 4));
      var r2 = document.createElement("div"); r2.className = "row2";
      r2.appendChild(fieldTr("下载按钮小字", "", [sid, "playLabel"]));
      r2.appendChild(fieldTr("下载按钮商店名", "", [sid, "playStore"]));
      root.appendChild(r2);
      root.appendChild(field("Google Play 链接", "", H.playUrl, function (v) { H.playUrl = v; }));
      root.appendChild(h2("轮播截图"));
      (H.slides || []).forEach(function (s, i) {
        var cd = card("截图 " + (i + 1));
        opsBtns(cd.querySelector(".item-head"), [
          ["↑", function () { if (i > 0) { var t = H.slides[i - 1]; H.slides[i - 1] = H.slides[i]; H.slides[i] = t; saveQuiet(); renderDrawer(sid); pvRefreshSoon(); } }],
          ["↓", function () { if (i < H.slides.length - 1) { var t = H.slides[i + 1]; H.slides[i + 1] = H.slides[i]; H.slides[i] = t; saveQuiet(); renderDrawer(sid); pvRefreshSoon(); } }],
          ["删除", function () { H.slides.splice(i, 1); saveQuiet(); renderDrawer(sid); pvRefreshSoon(); }, 1]
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
            H.slides.push({ src: path, cap: "", g: 0 });
            saveQuiet(); renderDrawer(sid); pvRefreshSoon();
            left--;
            if (left === 0) toast("截图已添加 ✓ 同步时上传");
          });
        });
        shotInput.value = "";
      };
      root.appendChild(addShot); root.appendChild(shotInput);
      root.appendChild(h2("右侧分组标签"));
      (H.groups || []).forEach(function (g, i) {
        var r = document.createElement("div"); r.className = "row2";
        r.appendChild(field("编号 " + (i + 1), "如 — 01", g.no, function (v) { g.no = v; }));
        r.appendChild(fieldTr("标签文字 " + (i + 1), "", [sid, "groups", i, "label"]));
        root.appendChild(r);
      });
    },
    numbers: function (root, sid) {
      root.appendChild(fsSlider(sid));
      var L = DATA[sid] || [];
      (L || []).forEach(function (n, i) {
        var cd = card("数字块 " + (i + 1));
        cd.appendChild(field("编号", "如 01", n.no, function (v) { n.no = v; }));
        cd.appendChild(fieldTr("标题", "", [sid, i, "title"]));
        cd.appendChild(fieldTr("描述", "", [sid, i, "desc"], 2));
        root.appendChild(cd);
      });
    },
    features: function (root, sid) {
      root.appendChild(fsSlider(sid));
      /* 兼容两形态：原版数据在顶层 DATA.intro2；实例（features-N）是嵌套对象 */
      var inst = !!DATA[sid];
      function P(k) { return inst ? [sid, k] : ["intro2", k]; }
      root.appendChild(fieldTr("小标", "", P("tag")));
      root.appendChild(fieldTr("标题", "", P("title")));
      root.appendChild(fieldTr("描述", "", P("desc"), 3));
    },
    modules: function (root, sid) {
      root.appendChild(fsSlider(sid));
      var L = DATA[sid] || [];
      (L || []).forEach(function (m, i) {
        var cd = card("模块 " + (i + 1));
        cd.appendChild(field("MODULE 编号", "如 MODULE01（清空则不显示）", m.mod, function (v) { m.mod = v; }));
        cd.appendChild(field("图注小字（FIG）", "如 FIG. 01 // 05", m.fig || "", function (v) { m.fig = v; }));
        cd.appendChild(fieldTr("标题", "", [sid, i, "title"]));
        cd.appendChild(fieldTr("描述", "", [sid, i, "desc"], 3));
        cd.appendChild(imagePicker(m.src, function (p) { m.src = p; saveQuiet(); pvRefreshSoon(); }));
        root.appendChild(cd);
      });
    },
    compare: function (root, sid) {
      root.appendChild(fsSlider(sid));
      var L = DATA[sid] || [];
      (L || []).forEach(function (c, i) {
        var cd = card("对比板块 " + (i + 1));
        cd.appendChild(field("左侧图（对比前）路径", "如 assets/shots/xx.jpg", c.before || "", function (v) { c.before = v; }));
        cd.appendChild(imagePicker(c.before || "", function (p) { c.before = p; saveQuiet(); pvRefreshSoon(); }));
        cd.appendChild(field("右侧图（对比后）路径", "", c.after || "", function (v) { c.after = v; }));
        cd.appendChild(imagePicker(c.after || "", function (p) { c.after = p; saveQuiet(); pvRefreshSoon(); }));
        cd.appendChild(fieldTr("说明文字（可空）", "", [sid, i, "caption"]));
        cd.appendChild(addBtn("删除此对比板块", function () { L.splice(i, 1); saveQuiet(); renderDrawer(sid); pvRefreshSoon(); }));
        root.appendChild(cd);
      });
      root.appendChild(addBtn("＋ 添加对比板块", function () { L.push({ before: "", after: "", caption: "" }); saveQuiet(); renderDrawer(sid); pvRefreshSoon(); }));
    },
    gallery: function (root, sid) {
      root.appendChild(fsSlider(sid));
      /* 兼容两形态：原版 galleryTitle 在顶层、描述在 DATA.gallery.desc；实例（gallery-N）两者都在嵌套对象内 */
      var inst = !!(DATA[sid] && DATA[sid].galleryTitle !== undefined);
      root.appendChild(fieldTr("画廊区块标题", "", inst ? [sid, "galleryTitle"] : ["galleryTitle"]));
      root.appendChild(fieldTr("画廊描述", "", inst ? [sid, "gallery", "desc"] : ["gallery", "desc"], 3));
      root.appendChild(field("画廊分组下拉里的说明文字", "展示组来自 LUT 展示编辑", "", function () {}, 1)).style.display = "none";
    },
    journal: function (root, sid) {
      root.appendChild(fsSlider(sid));
      /* 兼容两形态：原版字段在顶层（journalEyebrow 等）+ 顶层数组 DATA.journal；实例（journal-N）是嵌套对象 */
      var J = DATA[sid];
      var inst = !!(J && typeof J === "object" && !Array.isArray(J));
      root.appendChild(fieldTr("眉行小字", "左上角", inst ? [sid, "journalEyebrow"] : ["journalEyebrow"]));
      root.appendChild(fieldTr("大字标题", "", inst ? [sid, "journalTitle"] : ["journalTitle"]));
      root.appendChild(fieldTr("描述", "", inst ? [sid, "journalDesc"] : ["journalDesc"], 3));
      var list = inst ? (J.journal || (J.journal = [])) : (Array.isArray(J) ? J : (DATA.journal = DATA.journal || []));
      list.forEach(function (j, i) {
        var cd = card("文章 " + (i + 1));
        opsBtns(cd.querySelector(".item-head"), [
          ["↑", function () { if (i > 0) { var t = list[i - 1]; list[i - 1] = list[i]; list[i] = t; saveQuiet(); renderDrawer(sid); pvRefreshSoon(); } }],
          ["↓", function () { if (i < list.length - 1) { var t = list[i + 1]; list[i + 1] = list[i]; list[i] = t; saveQuiet(); renderDrawer(sid); pvRefreshSoon(); } }],
          ["删除", function () { list.splice(i, 1); saveQuiet(); renderDrawer(sid); pvRefreshSoon(); }, 1]
        ]);
        cd.appendChild(field("日期", "如 2026.06.06（可空）", j.date || "", function (v) { j.date = v; }));
        cd.appendChild(fieldTr("标题", "", inst ? [sid, "journal", i, "title"] : ["journal", i, "title"], 2));
        cd.appendChild(field("链接", "可空=不可点；#faq 站内锚点，https:// 外链；写了正文则优先打开站内文章页", j.href || "", function (v) { j.href = v; }));
        cd.appendChild(artEntryRow(j, function () { renderDrawer(sid); }));
        root.appendChild(cd);
      });
      root.appendChild(addBtn("＋ 添加一篇文章", function () { list.push({ date: "2026.06.06", title: "NEW ARTICLE TITLE", href: "", content: "" }); saveQuiet(); renderDrawer(sid); pvRefreshSoon(); }));
    },
    faq: function (root, sid) {
      root.appendChild(fsSlider(sid));
      /* 兼容两形态：原版字段在顶层（faqEyebrow 等）+ 顶层数组 DATA.faq；实例（faq-N）是嵌套对象 */
      var F = DATA[sid];
      var inst = !!(F && typeof F === "object" && !Array.isArray(F));
      root.appendChild(fieldTr("眉行小字", "", inst ? [sid, "faqEyebrow"] : ["faqEyebrow"]));
      root.appendChild(fieldTr("大字标题", "FAQ / SUPPORT 下方的大标题", inst ? [sid, "faqTitle"] : ["faqTitle"], 2));
      root.appendChild(fieldTr("板块描述", "", inst ? [sid, "faqDesc"] : ["faqDesc"], 3));
      var list = inst ? (F.faq || (F.faq = [])) : (Array.isArray(F) ? F : (DATA.faq = DATA.faq || []));
      list.forEach(function (f, i) {
        var cd = card("问题 " + (i + 1));
        opsBtns(cd.querySelector(".item-head"), [
          ["↑", function () { if (i > 0) { var t = list[i - 1]; list[i - 1] = list[i]; list[i] = t; saveQuiet(); renderDrawer(sid); pvRefreshSoon(); } }],
          ["↓", function () { if (i < list.length - 1) { var t = list[i + 1]; list[i + 1] = list[i]; list[i] = t; saveQuiet(); renderDrawer(sid); pvRefreshSoon(); } }],
          ["删除", function () { list.splice(i, 1); saveQuiet(); renderDrawer(sid); pvRefreshSoon(); }, 1]
        ]);
        cd.appendChild(fieldTr("问题", "", inst ? [sid, "faq", i, "q"] : ["faq", i, "q"]));
        cd.appendChild(fieldTr("回答", "", inst ? [sid, "faq", i, "a"] : ["faq", i, "a"], 3));
        root.appendChild(cd);
      });
      root.appendChild(addBtn("＋ 添加一条 FAQ", function () { list.push({ q: "新问题？", a: "回答内容" }); saveQuiet(); renderDrawer(sid); pvRefreshSoon(); }));
    },
    cta: function (root, sid) {
      root.appendChild(fsSlider(sid));
      root.appendChild(fieldTr("CTA 标语", "", [sid, "title"]));
      /* v62：下载按钮编辑（原版/实例路径恰好兼容——字段都在板块对象内）；链接留空=前台自动用首屏的 Google Play 链接 */
      var r0 = document.createElement("div"); r0.className = "row2";
      r0.appendChild(fieldTr("按钮上方小字", "留空=GET IT ON", [sid, "playLabel"]));
      r0.appendChild(fieldTr("商店名", "留空=GOOGLE PLAY", [sid, "playStore"]));
      root.appendChild(r0);
      root.appendChild(field("下载链接", "留空=自动用首屏按钮的 Google Play 链接；填 https:// 开头网址", DATA[sid] && DATA[sid].playUrl || "", function (v) {
        if (!DATA[sid]) DATA[sid] = {};
        DATA[sid].playUrl = v.trim();
      }));
      root.appendChild(field("页脚品牌名", "", DATA.footer.brand, function (v) { DATA.footer.brand = v; }));
      var r3 = document.createElement("div"); r3.className = "row2";
      r3.appendChild(fieldTr("隐私政策链接文字", "", ["footer", "privacyLabel"]));
      r3.appendChild(fieldTr("用户协议链接文字", "", ["footer", "termsLabel"]));
      root.appendChild(r3);
      root.appendChild(fieldTr("版权行", "", ["footer", "copy"]));
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

    }
  };

  function renderDrawer(id) {
    drawerBody.textContent = "";
    trPaths = [];
    var dashI = id.indexOf("-");
    var base = dashI > 0 ? id.slice(0, dashI) : id;
    var meta = SECTIONS_META[base] || SECTIONS_META[id];
    drawerTitle.textContent = meta ? "编辑 · " + meta.name + (base !== id ? " " + id.slice(dashI + 1) : "") : "编辑";
    var fn = DRAWERS[base] || DRAWERS[id];
    if (fn) {
      try { fn(drawerBody, id); } catch (e) {
        var eb = document.createElement("div");
        eb.style.cssText = "background:#3a1515;color:#ff9c9c;border:1px solid #a33;border-radius:6px;padding:10px;margin:10px 0;font-size:12px";
        eb.textContent = "编辑区加载失败：" + e.message;
        drawerBody.appendChild(eb);
      }
    }
    if (trPaths.length) drawerBody.appendChild(addBtn("自动翻译填空（翻译本板块留空的日语/中文）", fillTrBlanks));
    drawerBody.scrollTop = 0;
  }
  function selectSection(id) {
    if (id === "nav" || id === "") id = "hero";
    var dashI = id.indexOf("-");
    var baseS = dashI > 0 ? id.slice(0, dashI) : id;
    if (!SECTIONS_META[baseS]) id = "hero";
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
      /* v62：非 2xx 一律抛错（带 GitHub 返回的 message）——旧代码不检查 res.ok，4xx 被当成功静默吞掉（data.js 连续 7 次同步失败用户却看到"同步成功"） */
      return res.json().then(function (body) {
        if (!res.ok) {
          if (res.status === 401) throw new Error("Token 无效，请重新粘贴");
          if (res.status === 403 && String(body && body.message || "").indexOf("liudeqincanzai-ux.github.io") >= 0) throw new Error("令牌没有主仓库(liudeqincanzai-ux.github.io)权限：请编辑「Toneby LUT 编辑器 永久」，在存储库访问中加入 liudeqincanzai-ux.github.io");
          throw new Error("GitHub " + res.status + "：" + ((body && body.message) || "请求失败"));
        }
        return body;
      });
    });
  }
  /* v62：Git Data API 推送（blob→tree→commit→ref）——不依赖 contents API 的 GET sha（data.js 曾因该环节静默失败连续 7 次没推上），串行调用无竞态 */
  function pushFile(path, b64, message) {
    return ghApi("/repos/" + REPO + "/git/blobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: b64, encoding: "base64" })
    }).then(function (blob) {
      return ghApi("/repos/" + REPO + "/git/refs/heads/main").then(function (ref) {
        return ghApi("/repos/" + REPO + "/git/commits/" + ref.object.sha).then(function (c) {
          return ghApi("/repos/" + REPO + "/git/trees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base_tree: c.tree.sha, tree: [{ path: path, mode: "100644", type: "blob", sha: blob.sha }] })
          }).then(function (tree) {
            return ghApi("/repos/" + REPO + "/git/commits", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: message, tree: tree.sha, parents: [ref.object.sha] })
            }).then(function (commit) {
              return ghApi("/repos/" + REPO + "/git/refs/heads/main", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sha: commit.sha })
              });
            });
          });
        });
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
    /* v62：index.html 只预取+bump 生成内容（不再自行上传——旧 idxJob 与 data.js 并发 PUT 同分支有竞态，且其返回值被 reduce 二次当 b64 无效 PUT）；全部文件统一串行走 pushFile（Git Data API） */
    var idxJob = ghApi("/repos/" + REPO + "/contents/index.html").then(function (info) {
      var html = new TextDecoder().decode(Uint8Array.from(atob(String(info.content || "").replace(/\s/g, "")), function (c) { return c.charCodeAt(0); }));
      var m = /var V = "v=(\d+)"/.exec(html);
      if (!m) return null;
      var nv = parseInt(m[1], 10) + 1;
      html = html.replace('var V = "v=' + m[1] + '"', 'var V = "v=' + nv + '"');
      return ["index.html", Promise.resolve(toB64(new TextEncoder().encode(html))), "index.html v=" + nv + "（data.js 缓存刷新）"];
    }).catch(function () { return null; });
    var jobs = [["data.js", Promise.resolve(toB64(textEnc)), "data.js"]];
    Object.keys(pending).forEach(function (p) {
      jobs.push([p, pending[p].arrayBuffer().then(function (buf) { return toB64(new Uint8Array(buf)); }), p]);
    });
    idxJob.then(function (idx) {
      if (idx) jobs.push(idx);
      var done = 0, failed = 0;
      setStatus("同步中 0/" + jobs.length + " …");
      jobs.reduce(function (chain, job) {
        return chain.then(function () {
          return job[1].then(function (b64) {
            return pushFile(job[0], b64, "官网更新: " + job[2]);
          }).then(function () {
            done++;
            setStatus("同步中 " + done + "/" + jobs.length + " …");
            delete pending[job[0]];
          }).catch(function (e) {
            failed++;
            setStatus("「" + job[2] + "」失败：" + e.message, true);
          });
        });
      }, Promise.resolve()).then(function () {
        btnSync.disabled = false;
        if (failed === 0) {
          setStatus("✓ 已同步到 GitHub，网站约 1 分钟内更新");
          toast("同步成功 ✓");
        } else {
          setStatus("部分失败（" + failed + " 个），可重试；失败原因见上方", true);
        }
      });
    });
    };
    runSync(); /* v58：翻译改为前台实时（site.js 现场翻译+本机缓存），同步不再处理翻译 */
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
