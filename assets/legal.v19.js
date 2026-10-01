// 法务页（隐私政策 / 用户协议）：由 data.js 的 legal 字段渲染
(function () {
  var DATA;
  try { DATA = SITE_WEB; } catch (e) { DATA = null; }
  if (!DATA) return;

  var isTerms = location.pathname.toLowerCase().indexOf("terms") >= 0;
  var title = isTerms ? DATA.legal.termsTitle : DATA.legal.privacyTitle;
  var content = isTerms ? DATA.legal.termsContent : DATA.legal.privacyContent;

  document.title = title + " — " + (DATA.siteTitle || "Toneby");
  document.getElementById("legalTitle").textContent = title;
  document.getElementById("legalBody").innerHTML = content;

  // 导航与页脚（与首页一致，均可被后台编辑）
  var brand = document.getElementById("navBrand");
  var logoHtml = DATA.nav.logoSrc ? ('<img class="logo-img" src="' + DATA.nav.logoSrc + '" alt="">') : '<span class="mark">T</span>';
  brand.innerHTML = logoHtml + DATA.nav.brand;
  var nl = document.getElementById("navLinks");
  var dl = document.createElement("a");
  dl.className = "btn-nav";
  dl.textContent = DATA.nav.downloadLabel || "DOWNLOAD";
  dl.href = DATA.nav.downloadHref || "./#download";
  nl.appendChild(dl);
  (DATA.nav.links || []).slice().reverse().forEach(function (l) {
    var a = document.createElement("a");
    a.textContent = l.label;
    a.href = l.href || "#";
    if (a.getAttribute("href").charAt(0) === "#") {
      a.href = "./" + l.href; // 法务子页里的锚点指回首页对应区块
      a.addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "./" + l.href;
      });
    } else if (l.ext) { a.target = "_blank"; a.rel = "noopener"; }
    nl.insertBefore(a, nl.firstChild);
  });

  document.getElementById("footBrand").textContent = DATA.footer.brand;
  var fl = document.getElementById("footLinks");
  var p1 = document.createElement("a"); p1.textContent = DATA.footer.privacyLabel; p1.href = DATA.footer.privacyHref;
  var p2 = document.createElement("a"); p2.textContent = DATA.footer.termsLabel; p2.href = DATA.footer.termsHref;
  fl.appendChild(p1); fl.appendChild(p2);
  document.getElementById("footCopy").textContent = DATA.footer.copy;
})();
