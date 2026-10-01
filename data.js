// Toneby 官网数据 · 由统一后台（admin.html）编辑与同步
// 手动编辑请改下面的 SITE_WEB；图片文件放在 assets/shots/ 内。
const SITE_WEB = {
  nav: {
    brand: "TONEBY",
    downloadLabel: "DOWNLOAD",
    downloadHref: "#download",
    links: [
      { label: "FEATURES", href: "#features" },
      { label: "LUT GALLERY", href: "#gallery" },
      { label: "FAQ", href: "#faq" }
    ]
  },
  hero: {
    meta: "REFERENCE COLOR STUDIO // EST. 2026",
    title: "TONEBY: FILM COLOR<br>GRADING CAMERA.",
    intro: "Transform your phone into a reference-color film camera. Toneby matches the exact tones of any reference photo with authentic 3D LUTs, film grain and a real-time LUT camera — processed entirely on your device.",
    playUrl: "https://play.google.com/store/apps/details?id=com.ahs.referencetonematch",
    playLabel: "GET IT ON",
    playStore: "GOOGLE PLAY",
    groups: [
      { no: "— 01", label: "FILM COLOR ENGINE" },
      { no: "— 02", label: "LOCAL PRIVACY" },
      { no: "— 03", label: "LUT CAMERA & MORE" }
    ],
    slides: [
      { src: "assets/shots/shot_01.jpg", cap: "01 / 09 — HOME", g: 0 },
      { src: "assets/shots/shot_02.jpg", cap: "02 / 09 — REFERENCE MATCH", g: 0 },
      { src: "assets/shots/shot_03.jpg", cap: "03 / 09 — ADJUSTMENT PANEL", g: 0 },
      { src: "assets/shots/shot_04.jpg", cap: "04 / 09 — FILM GRAIN & HSL", g: 0 },
      { src: "assets/shots/shot_05.jpg", cap: "05 / 09 — BEFORE / AFTER", g: 0 },
      { src: "assets/shots/shot_06.jpg", cap: "06 / 09 — EXPORT", g: 0 },
      { src: "assets/shots/shot_07.jpg", cap: "07 / 09 — COLLAGE", g: 2 },
      { src: "assets/shots/shot_08.jpg", cap: "08 / 09 — SETTINGS", g: 1 },
      { src: "assets/shots/shot_09.jpg", cap: "09 / 09 — EXIF CONTROL", g: 1 }
    ]
  },
  numbers: [
    { no: "01", title: "FILM COLOR ENGINE", desc: "Match the exact tones of any reference photo. Authentic 3D LUTs, film grain, halation and bloom — rendered locally with GLSL precision, down to the curve." },
    { no: "02", title: "PRIVACY-FIRST ARCHITECTURE", desc: "Every photo is processed 100% on your device. Zero uploads, zero accounts, zero tracking. What happens on your phone stays on your phone." },
    { no: "03", title: "LUT CAMERA & MORE", desc: "Shoot with real-time film LUTs, import your own .cube files, and finish with multi-ratio grid collages. One studio, complete workflow." }
  ],
  intro2: {
    tag: "SYSTEM // FEATURES",
    title: "Professional film color grading, in your pocket.",
    desc: "A lightweight, 100% offline alternative to VSCO presets and Lightroom Mobile profiles — built for creators who demand reference-accurate color and absolute privacy."
  },
  modules: [
    { fig: "FIG. 01 // 05", mod: "MODULE01", title: "Reference color workspace.", desc: "Pick any reference photo and one tap matches its tones onto your shot. A gallery-style home keeps your work focused — like a private exhibition.", src: "assets/shots/shot_02.jpg" },
    { fig: "FIG. 02 // 05", mod: "MODULE02", title: "Powerful. Yet simple.", desc: "Match strength, local adjustment, dual LUT layers and per-channel curves — every parameter you need, nothing you don't. Copy, paste and sync settings across photos.", src: "assets/shots/shot_03.jpg" },
    { fig: "FIG. 03 // 05", mod: "MODULE03", title: "Film grain & HSL lab.", desc: "ISO-simulated grain from 100 to 3200 with black-and-white and color-dye modes, plus per-hue hue, saturation and luminance control. Analog texture, digital precision.", src: "assets/shots/shot_04.jpg" },
    { fig: "FIG. 04 // 05", mod: "MODULE04", title: "Export your way.", desc: "JPG, PNG or WebP. Full resolution or quick-share sizes. Full control over quality — batch export the whole set when the look is locked.", src: "assets/shots/shot_06.jpg" },
    { fig: "FIG. 05 // 05", mod: "MODULE05", title: "Settings & EXIF control.", desc: "Light and dark modes, four languages, and full control over which EXIF data — GPS, camera, shooting settings — stays embedded when you share.", src: "assets/shots/shot_08.jpg" }
  ],
  gallery: {
    title: "LUT Gallery",
    desc: "Explore the full film-style collection — G200T, 5207T, 5219T, D55T and more. Every look ships inside the app, ready for your photos and your camera.",
    cards: [
      { name: "G200T", sub: "GOLD 200 FILM" },
      { name: "5207T", sub: "CINEMA VISION3" },
      { name: "5219T", sub: "CINEMA VISION3" },
      { name: "D55T", sub: "DAYLIGHT 5500K" },
      { name: "GS800T", sub: "GRAY SCALE" }
    ],
    linkLabel: "OPEN FULL LUT GALLERY →",
    linkUrl: "https://liudeqincanzai-ux.github.io/toneby-lut-showcase/"
  },
  faq: [
    { q: "Are my photos uploaded to a server?", a: "No. Every photo is processed 100% locally on your device. Toneby has no accounts, no cloud uploads and no tracking — your images never leave your phone." },
    { q: "Can I import my own .cube LUT files?", a: "Yes. Import standard .cube LUT files and use them in the LUT camera and the reference-color workspace, alongside the built-in film-style collection." },
    { q: "What is included in Pro?", a: "Pro unlocks the full advanced toolkit — including premium LUT packs and pro grading tools. One-time purchase through Google Play billing." },
    { q: "Which devices are supported?", a: "Toneby runs on Android 10 and above and is optimized for the latest Android versions, including full support for edge-to-edge and dark mode." }
  ],
  cta: { title: "UPGRADE YOUR COLOR WORKFLOW." },
  footer: {
    brand: "TONEBY",
    privacyLabel: "Privacy Policy",
    privacyHref: "privacy-policy.html",
    termsLabel: "Terms of Service",
    termsHref: "terms-of-service.html",
    copy: "© 2026 Toneby. All rights reserved."
  }
};
